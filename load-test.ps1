$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhY2JkYTNjOTA1ZDRiYmVmNTIyYzc1NyIsImVtYWlsIjoidXNlcjFAdGVzdC5jb20iLCJhY2NvdW50X2lkIjoiNmFjYmRhM2M5MDVkNGJiZWY1MjJjNzU4IiwiaWF0IjoxNzkxNzQ4MTM2LCJleHAiOjE3OTE4MzQ1MzZ9.HNbcrDQDM04u4SKBVbj2-Gh1DdsB20AdK8-vZ6jUpGU"

$url = "http://localhost:3000/api/transfer"
$concurrent = 50
$totalPerWorker = 20

$jobs = @()
$startTime = Get-Date

Write-Host "Starting $concurrent concurrent workers..." -ForegroundColor Yellow

for ($w = 1; $w -le $concurrent; $w++) {
    $jobs += Start-Job -ScriptBlock {
        param($workerId, $token, $url, $count)
        $success = 0
        $fail = 0
        for ($i = 1; $i -le $count; $i++) {
            $headers = @{
                "Authorization" = "Bearer $token"
                "X-Idempotency-Key" = "worker-$workerId-key-$i-$(Get-Random)"
                "Content-Type" = "application/json"
            }
            $body = '{"from":"6acbda3c905d4bbef522c758","to":"6acbdba5905d4bbef522c75c","amount":1}'
            try {
                Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop | Out-Null
                $success++
            } catch {
                $fail++
            }
        }
        return @{ Success = $success; Fail = $fail }
    } -ArgumentList $w, $token, $url, $totalPerWorker
}

$totalSuccess = 0
$totalFail = 0

foreach ($job in $jobs) {
    $result = Receive-Job -Job $job -Wait
    $totalSuccess += $result.Success
    $totalFail += $result.Fail
    Remove-Job -Job $job
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds
$total = $totalSuccess + $totalFail

Write-Host "`n========== LOAD TEST RESULTS ==========" -ForegroundColor Green
Write-Host "Total Requests: $total"
Write-Host "Successful: $totalSuccess"
Write-Host "Failed: $totalFail"
Write-Host "Duration: $([math]::Round($duration, 2)) seconds"
Write-Host "Requests/sec: $([math]::Round($total / $duration, 2))"
Write-Host "=======================================" -ForegroundColor Green