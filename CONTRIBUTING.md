# Contributing

Thanks for contributing to `noxa-site-alert`.

## Good first contributions

- improve change detection quality
- add new notifiers
- tighten snapshot management
- improve docs for non-technical users
- add deployment recipes for common hosts

## Local workflow

```bash
npm run doctor
npm run init
npm run check
```

If you are working on delivery logic, configure Telegram locally and run:

```bash
npm run test-alert
```

## Style

- keep the runtime small
- prefer transparent logic over clever abstractions
- avoid adding dependencies unless they materially improve reliability

## Pull requests

Small focused PRs are easier to review than broad rewrites.
