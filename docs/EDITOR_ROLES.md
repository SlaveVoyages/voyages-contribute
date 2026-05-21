# Editor role for privileged endpoints

The bulk-import endpoints
(`/inspect-batched-contributions/:entityName`,
`/upload-batched-contributions/:entityName`,
`/upload-jobs/:jobId`) and any future "Editor"-gated route check for the
`Editor` role on the verified Supabase JWT. The middleware
(`src/backend/authz.ts`) reads it from `app_metadata` only — never from
`user_metadata`, which is self-editable by the end user.

A user is treated as an Editor if **either** of these is true on their JWT:

- `app_metadata.role === "Editor"`, or
- `app_metadata.roles` is an array that includes `"Editor"`.

## Granting the role

`app_metadata` is not editable by end users; it has to be set by an
administrator. The simplest way is a SQL statement against `auth.users` in
the Supabase project's database:

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"Editor"'
)
where email = 'editor@example.com';
```

To revoke:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = 'editor@example.com';
```

The user must obtain a fresh access token after the change (e.g. by logging
in again or refreshing) before the backend will see the new role.

## Verifying

Decode the access token at [jwt.io](https://jwt.io/) (or
`jose`'s CLI) and confirm the payload contains `"app_metadata": { "role":
"Editor" }`. If it does, calling any Editor-gated endpoint should succeed;
otherwise the server responds with `403 { "error": "Editor role required" }`.
