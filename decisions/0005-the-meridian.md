# 0005 · The Meridian is the signature

Date: 2026-10-03 · Status: accepted

## Context

A design system remembered for a colour or a typeface is remembered for decoration. A dashboard system should be remembered for how it reads.

## Decision

Every time chart and tile on a page shares one cursor: point at a day anywhere and every chart draws the same line, every figure reads that day, and in an MCP host the model is told which day the person is looking at. It works by pointer, touch and keyboard; it degrades to a private cursor for a chart that stands alone.

## Consequences

- Time charts on one page share one list of dates; a chart on another grain is a different page section, not a different Meridian.
- Tiles and the featured metric read daily values, so their data includes the daily series, not only the total.
