# rate-limiter-js

Option 1:
Local + "Complete" rate limiter
- Holds every request needed to calculate exactly when it can make another request
- Struggles to scale for large rate limits (>30k / interval)

Local + "Bucket" rate limiter
- Splits rate limit into constant number of buckets
- Accuracy is dropped to granularity of the bucket size.

Distro + fixed rate limiter
- Sacrifices peak throughput for easier scalability
- Fixed number of requests for each time window
- Workers can work on different machines
- Can requeue tasks if delays cause the workers to start late, and miss their time window

