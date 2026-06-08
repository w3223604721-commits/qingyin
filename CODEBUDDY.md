---
description: CloudBase AI Development Rules Guide - Provides scenario-based best practices to ensure development quality
globs: *
alwaysApply: true
inclusion: always
---

# CloudBase AI Development Rules Guide

## Activation Contract

This file is a compatibility projection of the CloudBase routing contract. Keep its semantics aligned with the CloudBase source guideline, and express routing with stable skill identifiers rather than repo-specific file paths.

## Existing Implementation First

When the workspace already contains an existing application with explicit TODO markers, fixed routes, or pre-created pages and services:

- Do **not** start with `ui-design`, design specs, or visual exploration unless the user explicitly asks for UI redesign.
- Do **not** broad-read unrelated skills first.
- First inspect the existing implementation surfaces that already own the flow.
- Prefer implementing TODOs and fixing the real broken flow in-place over creating parallel helpers.

## Core Principles

- **Do NOT use `any` to bypass type errors.**
- **Self-verify before claiming done.**
- **Do not paper over failures.**
- **`ai.createModel(...)` argument is a GroupName, not a vendor/model id.**

## Quick Reference

### When Developing a Web Project:
1. Environment Check: Call `envQuery` tool first
2. UI Design: Read `rules/ui-design/rule.md` first
3. Authentication: Use Web SDK built-in auth
4. Database: NoSQL SDK or MySQL tools

### When Developing a Mini Program Project:
1. Environment Check: Call `envQuery` tool first
2. UI Design: Read `rules/ui-design/rule.md` first
3. Authentication: Naturally login-free, get OPENID in cloud functions
4. Database: NoSQL wx-mp SDK or MySQL tools

### When Developing a Native App:
1. MUST use HTTP API (SDK not supported)
2. Only MySQL database supported
3. Read `http-api` and `relational-database-tool` rules

## Deployment Process

1. Backend (if applicable): Cloud functions or CloudRun
2. Frontend: Static hosting or CloudApp
3. Display deployment URLs
4. Update README.md with deployment info

## CloudBase Console Entry Points

All console URLs: `https://tcb.cloud.tencent.com/dev?envId=${envId}#/{path}`

- Overview: `#/overview`
- Document Database: `#/db/doc`
- MySQL Database: `#/db/mysql`
- Cloud Functions: `#/scf`
- CloudRun: `#/platform-run`
- Cloud Storage: `#/storage`
- Static Hosting: `#/static-hosting`
- Identity Auth: `#/identity`
- Logs & Monitoring: `#/devops/log`
- Environment Settings: `#/env`
