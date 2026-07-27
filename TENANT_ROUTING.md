# Tenant Routing

PoWR organizations can use hostnames such as `contoso.powr.dev`. The backend resolves the hostname through `organization_domains` at `GET /api/tenant/context`.

## Local testing

Set `ALLOW_TENANT_HEADER=true` only in local development. Then use the seeded hostname with the API:

```powershell
Invoke-WebRequest http://localhost:3001/api/tenant/context -Headers @{
  'X-PoWR-Hostname' = 'contoso-labs-1001.powr.dev'
}
```

The Next.js middleware recognizes `*.powr.dev` hosts and rewrites the tenant root to the public jobs page without exposing an internal route path. Recruiter routes remain on `/recruiter`.

## Deployment requirements

1. Configure wildcard DNS for `*.powr.dev` to the frontend host.
2. Configure a wildcard TLS certificate covering `*.powr.dev`.
3. Set `ALLOW_TENANT_HEADER=false` in staging and production.
4. Ensure the reverse proxy preserves the original `Host` header to the backend or forwards it through a trusted server-side header.

Unknown or suspended tenant domains return `404` from the tenant context endpoint.
