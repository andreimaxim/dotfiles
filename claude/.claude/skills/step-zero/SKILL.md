---
name: step-zero
description: User-directed initial codebase discovery
model: opus
---

# Research Codebase

You are tasked with conducting a comprehensive research across the codebase based on the user's directions and
by spawning parallel sub-agents and synthesizing their findings.

## **CRITICAL**: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY

- ALWAYS use the Read tool WITHOUT limit/offset parameters to read entire files
- DO NOT suggest improvements or changes
- DO NOT perform root cause analysis
- DO NOT propose future enhancements
- DO NOT critique the implementation or identify problems
- DO NOT recommend refactoring, optimization, or architectural changes
- ONLY describe what exists, where it exists, how it works, and how components interact
- You are creating a technical map/documentation of the existing system for other agents to use when navigating the codebase

## Initial Setup

1. Ensure the project is up to date by using a subagent run `bundle`
2. Read the existing routes and how they are mapped to controllers by running `bin/rails routes`

Read the `Gemfile`, then read the entire `config/routes.rb` file and search for mounted routes that don't belong to any
of the gems (e.g. Sidekiq, ActionCable) and use the **code-analyzer** to understand which endpoints are mounted and 
discover the controllers are serving those endpoints.

## Analysis

For each controller with a route, use the **code-analyzer** agent to understand HOW each controller action interacts with the models
(without critiquing).

Compile the output of all the agents into a single markdown file.