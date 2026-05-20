# UniPlug API

Backend for UniPlug chat and sync services.

## Environment variables

- `ALLOW_USE=true|false`
  Controls the frontend-facing availability flag exposed by `GET /api/unplug/status`.
  This does not disable `POST /api/chat` or `POST /api/sync/product`; it only reports whether the frontend should allow usage.

## API

- `GET /health`
- `GET /api/unplug/status`
- `POST /api/chat`
- `POST /api/sync/product`

`GET /api/unplug/status` returns:

```json
{
  "allowUse": true
}
```

If `ALLOW_USE` is unset, the API defaults `allowUse` to `false`.
