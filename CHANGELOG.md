# Changelog

## [0.2.0](https://github.com/Yaro812/ai-for-developers-project-386/compare/v0.1.0...v0.2.0) (2026-11-19)


### Features

* **backend:** list busy slots and record when a booking was created ([62f8fa2](https://github.com/Yaro812/ai-for-developers-project-386/commit/62f8fa2ce509857a46e8a101ee5770ddc48e8b63))
* **frontend:** reference design with a month calendar and slot statuses ([814a5e0](https://github.com/Yaro812/ai-for-developers-project-386/commit/814a5e06e62a211b421ca282b0267ef5780323f3))

## 0.1.0 (2026-11-18)


### Features

* **backend:** answer an event type by its id ([#17](https://github.com/Yaro812/ai-for-developers-project-386/issues/17)) ([6abeccb](https://github.com/Yaro812/ai-for-developers-project-386/commit/6abeccb8ddcc7e9796e77d7b09b6504506ef6715))
* **backend:** book a free slot without overlapping any booking ([#19](https://github.com/Yaro812/ai-for-developers-project-386/issues/19)) ([fb03016](https://github.com/Yaro812/ai-for-developers-project-386/commit/fb0301664aa64c2cce6c3ffdb036faa702722eec))
* **backend:** close the server on SIGINT and SIGTERM ([#22](https://github.com/Yaro812/ai-for-developers-project-386/issues/22)) ([d47aee9](https://github.com/Yaro812/ai-for-developers-project-386/commit/d47aee93eeac002d3f3e5c6915703d869fe50e32))
* **backend:** create event types ([#16](https://github.com/Yaro812/ai-for-developers-project-386/issues/16)) ([46f1426](https://github.com/Yaro812/ai-for-developers-project-386/commit/46f14264e9554f02e9764a0546a0702be02b2808))
* **backend:** list free slots of the booking window ([#18](https://github.com/Yaro812/ai-for-developers-project-386/issues/18)) ([c9e231e](https://github.com/Yaro812/ai-for-developers-project-386/commit/c9e231ecde323e92cc3a54a50e3f36bb1f3d6729))
* **backend:** list upcoming bookings of every event type ([#20](https://github.com/Yaro812/ai-for-developers-project-386/issues/20)) ([8917f5d](https://github.com/Yaro812/ai-for-developers-project-386/commit/8917f5d4a5d69b4bc2179acb66b881ffed0cb627))
* **backend:** scaffold Fastify app with smoke test ([44db1e0](https://github.com/Yaro812/ai-for-developers-project-386/commit/44db1e0618bcece9e4686e061ad4261d493c33e4))
* **backend:** serve health and event type catalog from the contract ([#14](https://github.com/Yaro812/ai-for-developers-project-386/issues/14)) ([1de735a](https://github.com/Yaro812/ai-for-developers-project-386/commit/1de735af9c6f9d002e75ddab6d9e6eb1ee41e1a8))
* **backend:** serve the built frontend next to the API ([#21](https://github.com/Yaro812/ai-for-developers-project-386/issues/21)) ([e35a125](https://github.com/Yaro812/ai-for-developers-project-386/commit/e35a1254a676a0475918d34e447810d66c55141f))
* **contract:** describe createEventType and its errors ([#16](https://github.com/Yaro812/ai-for-developers-project-386/issues/16)) ([3a03bca](https://github.com/Yaro812/ai-for-developers-project-386/commit/3a03bca542c5deee5a106495246280d20bdccf46))
* **contract:** describe health and event type catalog in TypeSpec ([#14](https://github.com/Yaro812/ai-for-developers-project-386/issues/14)) ([6423a7f](https://github.com/Yaro812/ai-for-developers-project-386/commit/6423a7feacbecf520100e66899ceab1b18603d64))
* **contract:** describe the ROUTE_NOT_FOUND error ([#21](https://github.com/Yaro812/ai-for-developers-project-386/issues/21)) ([df7e067](https://github.com/Yaro812/ai-for-developers-project-386/commit/df7e067edca14b54bee96e80f732ee6457b5b653))
* **docker:** build the app into one image from sources ([#22](https://github.com/Yaro812/ai-for-developers-project-386/issues/22)) ([4bfd169](https://github.com/Yaro812/ai-for-developers-project-386/commit/4bfd16951ed95db88cfff684053c0ee152fe855e))
* **frontend:** add home page leading to the event type catalog ([d689dae](https://github.com/Yaro812/ai-for-developers-project-386/commit/d689dae91639b25e5a3152a0ba0726a3ebfc93e0))
* **frontend:** add the new event type page ([#16](https://github.com/Yaro812/ai-for-developers-project-386/issues/16)) ([73acfd7](https://github.com/Yaro812/ai-for-developers-project-386/commit/73acfd7b465b59c158e8411bc703224da7c2ed58))
* **frontend:** book the chosen slot and confirm it on the booking page ([#19](https://github.com/Yaro812/ai-for-developers-project-386/issues/19)) ([41eb07d](https://github.com/Yaro812/ai-for-developers-project-386/commit/41eb07d42ec76ab69eb697ea17e34bd9905a7717))
* **frontend:** choose a day and a free slot on the booking page ([#18](https://github.com/Yaro812/ai-for-developers-project-386/issues/18)) ([43c8dba](https://github.com/Yaro812/ai-for-developers-project-386/commit/43c8dba2beb547f41d2f63e03673ef6bdf9b1939))
* **frontend:** load the event type catalog through the SDK ([#14](https://github.com/Yaro812/ai-for-developers-project-386/issues/14)) ([1d5595e](https://github.com/Yaro812/ai-for-developers-project-386/commit/1d5595e7c78089c43d33d150c01ac43e33eeb7f8))
* **frontend:** scaffold Vite React app with Mantine ([5cc51cf](https://github.com/Yaro812/ai-for-developers-project-386/commit/5cc51cfb7b3c9d3e332d25a7422bd70ae66a8e86))
* **frontend:** show the event type on its booking page ([#17](https://github.com/Yaro812/ai-for-developers-project-386/issues/17)) ([9c6875e](https://github.com/Yaro812/ai-for-developers-project-386/commit/9c6875ef7298e9c84753050165c50be204712390))
* **frontend:** show upcoming bookings to the owner ([#20](https://github.com/Yaro812/ai-for-developers-project-386/issues/20)) ([41e8a71](https://github.com/Yaro812/ai-for-developers-project-386/commit/41e8a71b6b9cab5993ad3fc9a1046f8574b43c97))


### Bug Fixes

* **backend:** reject wrongly typed fields with 400 ([#16](https://github.com/Yaro812/ai-for-developers-project-386/issues/16)) ([0f36b89](https://github.com/Yaro812/ai-for-developers-project-386/commit/0f36b894b23f1a854ef6a2d3d14b324b65351e1a))
* **frontend:** handle unknown routes and title the catalog ([e1ea636](https://github.com/Yaro812/ai-for-developers-project-386/commit/e1ea6368c9a9e5fcb794c9d2f67a82bc374f9e1c))
* **frontend:** name free slots on the home page by the glossary term ([4a85af0](https://github.com/Yaro812/ai-for-developers-project-386/commit/4a85af0d26861fb9dade3df089e38e8a5c131d6c))
* **frontend:** set page titles with React title elements ([48e91bf](https://github.com/Yaro812/ai-for-developers-project-386/commit/48e91bff6f902dc377679e9ae9763b580fc85806))
