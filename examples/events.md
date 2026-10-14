# Events

```bash
WEBHOOK_OUT_URL=http://webhook-out.internal:3009
WEBHOOK_OUT_API_KEY=<a webhook-out key with the publish role>
DENIED_SPIKE_THRESHOLD=20
DENIED_SPIKE_WINDOW_SEC=60
```

| Event | When | Data |
|---|---|---|
| `ops.audit.denied_spike` | One source (the key id of the writing service) stored `DENIED_SPIKE_THRESHOLD` or more `denied` events within `DENIED_SPIKE_WINDOW_SEC` | `source`, `count`, `windowSec` |

A single denial is normal (a wrong key, a role that is too low). A burst is a leaked key being tried, a deploy with the wrong key, or a scan; atc-status turns the event into an alert. After a report the counter of that source restarts, so a sustained burst reports once per window.

Counting is in memory per process and starts empty after a restart; duplicates of an already stored event (same client id) are not counted. `DENIED_SPIKE_THRESHOLD=0` turns the event off.

Pitfalls:
- The source is the audit key id, not the end user: a spike names the service that wrote the events, look at `GET /v1/events?outcome=denied` to see who was denied.
