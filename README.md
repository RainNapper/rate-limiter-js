# rate-limiter-js
Node 14 + yarn.

Option 1:
Local + "Complete" rate limiter (`yarn local` after you update import in `src/main/local/index.ts`)
- Holds every request needed to calculate exactly when it can make another request
- Struggles to scale for large rate limits (>30k / interval)

Local + "Bucket" rate limiter (`yarn local`)
- Splits rate limit into constant number of buckets
- Accuracy is dropped to granularity of the bucket size.

Distro + fixed rate limiter (`yarn distro`)
- Sacrifices peak throughput for easier scalability
- Workers can work on different machines
- Fixed number of requests for each time window
- Can requeue tasks if delays cause the workers to start late, and miss their time window

