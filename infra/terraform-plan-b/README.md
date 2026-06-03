# Legacy Plan B

The former Plan B Terraform stack was intentionally destroyed and disabled.

Do not recreate the old ECS/RDS/Redis/ALB stack from this directory. Future
Plan Plus work must start from a new minimal module that is dormant by default,
does not own frontend buckets, does not create a second source-of-truth
database, and cannot create paid runtime resources unless explicitly enabled.
