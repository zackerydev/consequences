---
type:
  - slides
date: 2025-07-18
transition: none
theme: serif
tags:
  - slides
---
********

## GitHub Actions
### Zero to Hero

Zackery Griesinger

note:
- Welcome welcome welcome, my name is Zack and I'm going to attempt to teach you (almost) every bit of information I am cursed with having when it comes to GitHub actions.

---

### About Me
note: 
- To start, a little about me
---
<split left="2" right="2" gap="2">
<div>
![[Pasted image 20250810065843.png]]
</div>
<div>
![[Pasted image 20250810070053.png]]
</div>
</split>
note: 
- Been writing code for almost a decade
- Industry for 8 years, started at Cerner, then in two fintech startups
- My free time, I'm watching baseball, reading or "hanging out" with my four month old!
 
---
![[Pasted image 20250810070648.png]]
note:
- anyway, in my time in fintech I've been working on what I would lovingly call a "DevOps" team
- **who here works on a devops team?**
    - specifically, if you wrote one pipeline at one point and now "own" it
    - or, if you are the person people ask when GitHub is down
    - or, if you are the person people ask when they get hit with red scaries in their terminal and get stuck
- alright, now, please keep your hand raised if you or a loved one has been personally victimized by this man
---
![[Pasted image 20250810071132.png]]
note:
- ah yes, if you have your hand raised, we have similar scar tissues
- this man is personally responsible for my own - if you'll pardon the pun - butlerian jihad against Groovy, Java and all JVM usage
    -  I might have been the only person happy about the Oracle acquisition - now I have a good reason to back my hatred for the JVM and Java in general
- if I had a nickle for everytime I've migrated a fintech scale up from Jenkins to GitHub actions, i'd have two nickels, which isn't a lot but its weird that it happened twice
- alright, enough of my personal tirade, let's start talking about GitHub Actions
---
# Getting Started
---
## What is GitHub Actions?
---
GitHub's Native CI/CD Workflow Builder
![[CleanShot 2025-08-05 at 20.31.01@2x.png]]

note: 
- Release in 2018
- Actions is GitHub entry into the CICD space.
- Allows you to build workflows that listen to native GitHub events and run commands accordingly
- Not going to lie, if you haven't tried Actions in the last year or two a lot has changed and got better, from a functionality and UI standpoint
- At this point there's very little reason to go elsewhere
---
## Why GitHub Actions?
note:
- so maybe you are on Jenkins or CircleCI, _why_ should you move to GitHub actions?
- It's a valid question, if what you have "works" for you now
---
- Your developers are lazy (less clicks = good)
note:
- in my half a decade of building on a "platform" team this is basically a fact of life.
- Your developers are LAZY
- Blue Ocean vs Actions Clicks
---
- Your developers are lazy (less clicks = good)
- You get "free" minutes
note:
- more on cost later, but if you are paying for GitHub you get some minutes, if you are on a free account you also get _some_ minutes
---
- Your developers are lazy (less clicks = good)
- You get "free" minutes
- Ease of reuse, well supported, great tooling
note:
- Public Action marketplace
- GitHub is (probably) not going away
- Supported
---
- Your developers are lazy (less clicks = good)
- You get "free" minutes
- Ease of reuse, well supported, great tooling
- Simpler SDLC Supply Chain
note:
- NO control plane*
- You are probably already dependent on the control plane
---
### Action's User Interface
![[CleanShot 2025-08-05 at 20.33.51@2x.png]]
note:
- start here
- if you don't see it - Actions is likely disabled at the org level for you
---
Job List
![[CleanShot 2025-08-05 at 20.38.09@2x.png]]
note:
- job list
- _all_ workflows
- ordered by name
- below you have some metadata / dashboards
---
Workflow Runs
![[CleanShot 2025-08-05 at 20.38.09@2x 1.png]]
note:
- workflow run pane
- shows status, running, errored, failed, cancelled
- how long it ran, what branch

---
Workflow Filters
![[CleanShot 2025-08-05 at 20.39.17@2x.png]]
note:
- robust filtering
---
Workflow Run - Overview
![[CleanShot 2025-08-05 at 20.40.58@2x.png]]
note:
- left pane, JOB list (more later)
- right pane, metadata and visualization
---
Workflow Run - Job Log
![[CleanShot 2025-08-05 at 20.42.23@2x.png]]
note:
- clicking into a job gives you the job log
- searchable
- expandable
---
Workflow Run - Job Log Settings
![[CleanShot 2025-08-05 at 20.42.48@2x.png]]
note:
- re-run, button on top right
- show timestamps ✅
- raw logs
---
#### Disabling Workflows
You can easily "pause" or disable workflows 

![[CleanShot 2025-08-09 at 18.31.28@2x.png]]

---
# Day One
##  Pipelining
---
`.github/workflows/*.yaml` (or `yml` 😉)

note:
- alright so let's create some workflows
- you create them at the _root_
- yaml or yml, I'm a yaml apologist so i consider this a feature not a bug

---
## Jobs
---

#### Jobs
```yaml [1-2|3|4|5|6|7|8|9-10]
jobs:
  my-job: # job id
    name: 'My Job' # job name
    runs-on: ubuntu-latest # runners (more on that later)
    timeout-minutes: 360 # job timeout
    continue-on-error: false # ignore failures
    if: ... # conditionals
    needs: <other-job> # dependencies
    env:
      ENV: ENV_VARS # env vars shared by all steps
```

note:
- the job id there shows up in the UI on PR as name if omitted, so it's somewhat important for aesthetics
- timeout - consider this required, more on why later
---
#### Jobs (Continued)
```yaml [3-4|5-7|8-11]
jobs:
  my-job: # job id
    outputs: # outputs for other stages
      output1: ${{ steps.step1.outputs.test }}
    environment: # GH Environment environment != env
      name: dev_environment
      url: https://staging.consequences.dev
    defaults: # shared job defaults for all steps
      run:
        working-directory: ./scripts
        shell: bash
```

---
#### Jobs - Parallelism

```yaml
jobs:
  analysis:             # <-- runs first
  build:                # -┐
    needs: analysis     #  |- runs in parallel
  lint:                 #  |
    needs: analysis     # -┘
  cleanup:              # <-- runs after parallel step
    needs: [build, lint]
```

note:
- jobs have the first parallelism primitive
---
#### Jobs - Parallelism
![[CleanShot 2025-08-10 at 08.01.13@2x.png]]

---
#### Jobs are _Stateless_
- Jobs are the individual unit of state, future jobs cannot reference anything from past jobs.
- You can pass state between jobs with `actions/upload-artifact` or `outputs`
```yaml [3-4|6-7|11]
jobs:
  setup:
    outputs:
      version: ${{ steps.get_version.outputs.version }}
    steps:
      - id: get_version
        run: echo "version=1.2.3" >> $GITHUB_OUTPUT
  build:
    needs: setup
    steps:
      - run: echo ${{ needs.setup.outputs.version }}
```
note:
- you can also pass data with upload artifact
- I haven't really had a use case for this - typically passing artifacts is useful for codecoverage reports or logs

---
# Steps
---
Steps
```yaml [5-6|7|8|9|10|11|12|13-14]
jobs:
  my-job:
    # ...
    steps:
      - id: step-id
        name: Display Name # Name displayed in GitHub UI
        run: ... # what to actually run on this step
        if: ... # conditionals
        continue-on-error: false # ignore failures
        shell: bash # default step entrypoint
        working-directory: ./my-dir # step root directory
        timeout-minutes: 0 # timeout for the specific step
        env: # EnvVars shared by only the step
          MY: variable
          
```

---
**Steps (example)**
```yaml[]
jobs:
  ci:
    steps:
      - id: install
        name: 'Install Prod Dependencies with PNPM'
        run: pnpm install
        env:
          NODE_ENV: production
```
note:
A simple step might look something like this

---
#### Using Public Actions (Steps)

The power of GitHub Actions is in the Marketplace
![[CleanShot 2025-07-27 at 09.53.15@2x.png]]

---
Shared actions are shared _steps_ not _jobs_

note:
- you can have a job that is just a shared step, but this is an important distinction. AFAIK there's no way to share an entire job
- implemented in node, yaml or go
---
#### `uses` and `with`
```yaml [4-5|6-7]
jobs:
  my-job:
    steps:
      # uses: organization/repo@<git ref>
      - uses: actions/checkout@v4 
        with: # with are all the "arguments" to the step
          fetch-depth: 10
      
```
`with` arguments correspond to inputs defined by `action.yml` or the composite action inputs.
note:
- uses, org and repo and SHA
- with: inputs to that action, defined in that ref's `action.yml` file

---
> "All Marketplace Actions are created equal, but some are more equal than others"
> 
> — Someone Probably

note:
- Important to remember, not all actions are created equal
- Actions are the marketplace are mostly random, you shouldn't expect them all to be high quality, efficient or even secure.
---

#### Finding High Quality Marketplace Actions
- ✅ Published by a reputable GitHub Org
    - (e.g. `actions/`)
- ✅ Actively Maintained
- ✅ Verified

![[CleanShot 2025-07-27 at 10.10.47@2x.png]]

---
#### Abstractions are trade-offs

```yaml [1-6|7-10]
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: user/app:latest
- name: docker build
  run: |
    docker build . -t user/app:latest
    docker push user/app:latest
```

note:
- another important fact of shared actions, like everything, using them is a tradeoff, specifically an abstraction
- compare first and second approach

---

### YAML Side Note #1
Multi line strings with `|` are your friend.
```yaml []
steps:
  - name: a long set of scripts
    run: |
      echo 'hi world!'
      echo 'every new line'
      echo 'is a new command!'
```

---


You can run all the `steps` inside a `job` in parallel with the `matrix` keyword and variable expansion
```yaml [3|4-5|6|7|8-11]
jobs:
  job:
    strategy:
      matrix:
        node-version: [18, 20, 22]
      fail-fast: true # cancel all if any matrix job fails
      max-parallel: 10 # max parallel count
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

note:
- max parallel caps at 128
- matrices are true matrices, if you matrix by multiple values you get m x n job runs.
---
### Matrix vs Job Parallelism
- Use a matrix when you want to write the _same workflow_ with N number of slightly different inputs.
- Use job parallelism when you want to run two completely separate jobs at the same time.
---

 Steps - `include`
 
```yaml [5-7|8-10]
jobs:
  ci:
    strategy:
      matrix:
        command:
          - typecheck
          - test
        include:
          - command: lint
            root: true
```
---
#### Matrix Parallelism - `include`
```yaml[6,8|]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: ./.github/actions/setup
      - run: pnpm run -r ${{ matrix.command }}
        if: ${{ !matrix.root }}
      - run: pnpm run ${{ matrix.command }}
        if: ${{ matrix.root }}
```
---
![[CleanShot 2025-08-09 at 20.08.26@2x.png]]

---
### Variables and Context
---
All Actions can access various global variables and functions with `${{ }}`
```yaml[]
steps: 
  - name: print
    run: echo ${{ github.actor }} # global github context
```
---
#### Commonly Used Variables
- `github.actor`: user who triggered the workflow
- `github.base_ref`: target branch of a PR run
- `github.sha`: commit that triggered the run
- `github.event`: the full event webhook payload

---
#### Environment Variables
```yaml [2-5|6|7-9|10-11]
job:
  env:
    message: "hi world"
  steps:
    - run: echo $MESSAGE # prints hi world
    - run: echo ${{ env.message }} # prints hi world
    - run: echo $MESSAGE # prints hello
      env:
        message: "hello"
    - run: echo "MESSAGE=goodbye" >> $GITHUB_ENV
    - run: echo ${{ env.MESSAGE }} # prints goodbye
```
---
#### Variables and Secrets
![[CleanShot 2025-08-09 at 18.58.54@2x.png|700]]
note:
- docker login example
---
#### Variables and Secrets
```yaml [2-3|5-10]
job:
  env:
    message: ${{ vars.DEFAULT_GREETING }}
  steps:
    - run: echo $MESSAGE # prints default greeting
    - run: >-
        docker login
          -u ${{ vars.DOCKER_USER }} # not secret
          -p ${{ secrets.DOCKER_USER }} # secret!
```
---
#### Variables and Secrets
- Variables _and_ Secrets can be defined at the repository and organization level
- Secrets are _write only_, you can't read them in the UI 
---
Wait wait wait - what was `>-`???

---

#### YAML Side Note #2
"the **pipe with chomp modifier** (`>-`)"
```yaml
multiline: >-
  hello
  world!
```
goes in, and
```yaml
multiline: hello world!
```
 comes out! No more `\`!!

---
#### Logical Operators
```yaml [1|2|3|4|5]
if: github.event_name == 'push'
if: github.event_name != 'push'
if: env.this && env.that
if: env.this || env.that
if: ${{ !(env.this != 'true') }}
```
note:
- compare to groovy, which has infinite "scriptability"
- but that's a mess
---
#### Built-In Functions

Built-ins usable with `${{ }}` or `if`

```yaml [1|2-3|4|5-6|7-9]
if: contains(github.ref, 'release')
if: startsWith(github.ref, 'refs/tags/')
if: endsWith(github.ref, '/main')
run: echo "${{ format('Hello {0} {1}', 'World', '!') }}"
# flatten and join list of objects with ,
run: echo "${{ join(list.*.name, ', ') }}"
# stringify/parse json
run: ${{ toJson(github) }}
run: ${{ fromJson(env.JSON_ENV_VAR) }}
```
---
# Triggers
---
#### Basic Triggers

 ```yaml []
on:
  <event_type>:
    types: []  # activity type
```

---
#### Example Triggers
Trigger on push

```yaml []
on: push
```
---
#### Example Triggers
Trigger on push, excluding some branches
```yaml []
on:
  push:
    branches-ignore:
      - dependabot/**
```

---
#### Example Triggers
Trigger on pull requests against `main`
```yaml []
on:
  pull_requests:
    branches:
      - main
    
```

---
#### Example Triggers
When a pull request targeting `main` is `labeled` or `unlabeled`
```yaml []
on:
  pull_requests:
    branches:
      - main
    types:
      - labeled
      - unlabled
```


---
#### Workflow Dispatch
Triggering workflows manually
```yaml [1-11]
on:
  workflow_dispatch:
    inputs:
      name:
        description: 'Name'
        required: true
        type: string
      age:
        description: 'Age'
        required: true
        type: number
```
note:
- there's also an identical type called repository dispatch, which is triggerable only from the API
---
#### Workflow Dispatch (continued)
```yaml []
jobs:
  greeting:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: ./.github/actions/setup
      - run: pnpm install
      - run: echo ${{ inputs.name }}
      - run: echo ${{ inputs.age }}
```
---
#### Workflow Dispatch
![[CleanShot 2025-08-09 at 20.10.37@2x.png]]

note:
- always runs from a branch
---
#### Cron Scheduling 
```yaml []
# .github/workflows/crons.yml
on:
  schedule:
    - cron: "0 9 * * 1"
    - cron: "0 15 * * *"
```
But Zack! Won't this run all my `jobs` for each crontab entry!?

---

#### Cron Scheduling

```yaml
# .github/workflows/003-crons.yml
jobs:
  my-first-job:
    # ...
    if: github.event.schedule == '0 9 * * 1'
  my-second-job:
    # ...
    if: github.event.schedule == '0 15 * * *'
```

---

#### Gotcha - Pull Request Trigger
`on: pull-request`
- Does **not** run if the Pull Request has merge conflicts
- The $GITHUB_SHA variable  is the "Pull Request Merge Branch", which is a temporary merge commit of the Pull Requests' changes on top of the `HEAD` of the target branch

---
####  Triggers
- Excluding things like bot commits, documentation updates etc. can save you a lot of time (and money!)
- Some triggers only fire when the action is on the default branch, look for this callout in the docs.
  ![[CleanShot 2025-08-09 at 20.11.44@2x.png]]
---

## Day Two

So you can write a pipeline, now what?

note:
- you can write a pipeline
- now you have to roll it out to your organization
- train up developers
    - maybe you live in a utopia where devs write their own pipelines

---
### Developer Experience

---
#### `actionlint`

```bash []
brew install actionlint
actionlint
```
![[CleanShot 2025-07-29 at 07.17.08@2x.png]]

---
#### Language Services
VSCode Extension

![[CleanShot 2025-07-29 at 07.18.39@2x.png]]
(`https://github.com/lttb/gh-actions-language-server` for other editors)

---

![[CleanShot 2025-07-29 at 07.21.20.gif]]

---
#### Naming Things
- GitHub Actions has a frankly pretty awful UX when you start getting 10+ workflows in your repository 
- Name your workflows with `/` as separators and scopes in order to get them easy to grok
```yaml []
name: ci / main
jobs:
  analysis:
    # <...>
```
- This is why creating a single `crons` workflow is valuable!
---
#### Naming Things (Example)
![[CleanShot 2025-08-09 at 18.28.23@2x 1.png]]
---
#### The Pin....

![[CleanShot 2025-07-29 at 07.27.33@2x.png]]
You can pin a workflow to the top of the repository... but be warned... it's pinned for everyone not for just you!

---
#### `act` CLI

https://github.com/nektos/act/

Test your actions locally with `act`

---
#### `act` CLI
- Also has workflow validation
- Renders Action flow graphs
![[CleanShot 2025-08-09 at 18.19.09@2x.png]]

---
# Security
---

GitHub Actions  is a large attack vector for your organization.

note:
- disclaimer - this is not exhaustive!

---
### Pinning to a SHA

You can (and should) pin your public actions to a specific SHA (tags are mutable)
```yaml []
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71b5...f683 # v4.2.2
```
---
#### Pinning to a SHA
- `actions/*` are somewhat safer  (but not risk free)
- add a comment saying what version
- FULL SHA is required

---
> Friends don't let friends pipe to bash
---

🙅‍♂️

`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

---

✅
![[CleanShot 2025-07-29 at 07.47.37@2x.png]]
---

But what about using
![[CleanShot 2025-07-29 at 07.50.56@2x.png]]
????

---

Gotcha! It's still pipe to bash!
![[CleanShot 2025-08-03 at 06.20.43@2x.png]]

---
#### Isn't this a little overkill?

---
![[CleanShot 2025-08-09 at 16.29.35@2x.png]]

---
`$GITHUB_TOKEN`
- Authenticated for the lifetime of the Action run
- Automatically authenticated to `git` and `gh`
- Default minimal permissions
---
#### `$GITHUB_TOKEN` Examples
```yaml [1-4|5-11]
permissions:
  contents: read
  issues: write
  pull-requests: none
job:
  my-job:
    steps:
      - run: 'echo "hi world"'
        env:
          GITHUB_TOKEN: ${{ github.token }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
---
#### `$GITHUB_TOKEN` limitations
- It (and the things it triggers) _cannot_ trigger other workflow runs
- It cannot access other repos

> If you need either of these use cases - use a Personal Access Token... _carefully_

---
#### `$GITHUB_TOKEN` Org-wide Settings
![[CleanShot 2025-08-03 at 06.49.56@2x.png]]

---
#### Organization Settings
![[CleanShot 2025-08-03 at 06.48.43@2x.png]]
---

### Dependabot
Dependabot works with GitHub Actions!
```yaml []
# .github/dependabot.yml
version: 2
updates:
  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    labels:
      - "dependencies"
```

It will even respect your SHA pinning!

---
# Environments
---
![[CleanShot 2025-08-09 at 18.59.54@2x.png]]
---
####  Environments
- Provide approval steps (Enterprise only!)
- Specific secrets.
- Specific branches.
```yaml[]
jobs:
  deploy-staging:
      environment:
        name: staging
        url: my-staging-url.com
```
---
# Monitoring
---

#### `always()` `failure()` and `success()`

```yaml
if: ${{ always () }} # run everytime
if: ${{ failure() }} # run on failure
if: ${{ success() }} # run on success
if: ${{ cancelled() }} # run if canceled (cleanup)
```
---
####  Monitoring
- Send failures to Slack or Team
- Track with Google Analytics, Segment, etc.
- Native Monitoring??
---
#### Example: Send to Slack

```yaml [3|1-13]
- name: Post a message in a channel
  uses: slackapi/slack-github-action@v2.1.1
  if: ${{ always() }}
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    webhook-type: incoming-webhook
    payload: |
      text: "Result: ${{ job.status }}"
      blocks:
        - type: "section"
          text:
            type: "mrkdwn"
            text: "Result ${{ github.sha}}"
            
```
---
## Native Monitoring
---
#### Insights Tab
![[CleanShot 2025-08-09 at 18.53.14@2x.png|700]]
---
## Reusing Workflows

note:
- one of the challenges when scaling

---
#####  Composite Workflows
```yaml [1|4-5|6-9|11|1-20]
# .github/actions/greet/action.yml
name: greet
description: Custom greeting!
outputs: # ...
inputs:
  greeting:
    description: 'greet someone!'
    required: true
    default: 'World'
runs:
  using: composite
  steps:
    - name: greet
      run: "echo ${{ inputs.greeting }}"
      shell: bash
```
---
#### Composite Workflows (Continued)
```yaml []
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2 # important!
      - uses: ./.github/actions/greet
        with:
          greeting: 'hi!' 
```
---
#### Referencing Other Repos
```yaml []
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: OWNER/repo@SHA
        with:
         greeting: 'Hello' 
```
note:
- you can use the @TAG to your advantage inside your org
- roll out org wide version upgrades

---
#### Referencing Other Repos - Permissions
- To use `uses:` on another repo you need to
    - Set the repo to be a GitHub Actions source repository
    - Authenticate `git` with a PAT that has access to the repo
![[CleanShot 2025-08-09 at 18.54.10@2x 2.png]]
---
## Day Three
### Excellence
note:
- everything's glorious - now what?
---
## Cost Management
note:
- director knocks on your door
- couple levers you can pull
---
#### Cost Management
- Minutes are rounded "up"
    - 30s workflow -> 1 minute of billing
- Some amount of minutes are "free" (as in drugs)
- Self-Hosted runner minutes are "free" (as in baby)
<center>
![[Pasted image 20250814210659.png|300]]
</center>
---
#### Insights - Actions Usage Metrics
![[CleanShot 2025-08-09 at 20.04.00@2x.png]]
---
#### Timeouts
```yaml[]
jobs:
  analysis:
    timeout-minutes: 10
    cancel-timeout-minutes: 10 # ???
```

The default timeout is SIX HOURS 😱

---
#### Concurrency
`concurrency` can be used to cancel inflight jobs you know are going to be useless
```yaml
concurrency:
  cancel-in-progress: true
  # cancel any other workflow run when a new one 
  # kicks off for this PR
  group: pr-${{ github.event.pull_request.number }}
```
---
#### Concurrency Example
![[CleanShot 2025-08-09 at 18.57.12@2x.png]]
---
#### Limits
They give away the first dose free
![[Pasted image 20250803190356.png]]

---
![[CleanShot 2025-08-03 at 19.04.45@2x.png]]
note:
- callout modifiers on the right
---

Yes, `macos` runners are 10x the cost... just use Linux

---
#### Budgets
![[CleanShot 2025-08-03 at 19.06.56@2x.png]]
---
![[CleanShot 2025-08-03 at 19.07.16@2x.png]]

---

# Self Hosting
---
#### `actions-runner-controller` 👍
- Kubernetes based
- Dynamic scaling (pay for only what you use)
- Ephemeral 
![[CleanShot 2025-08-03 at 19.14.35@2x.png]]
---
#### RunsOn ❓
`https://runs-on.com/`
- Cloudformation 
- Dynamic scaling
- Ephemeral
![[CleanShot 2025-08-03 at 19.15.15@2x.png]]

---
#### Blacksmith/Namespace.so/BuildJet
- Drop in replacement
- Cheaper than default
- Not really self hosted
![[CleanShot 2025-08-03 at 19.19.57@2x 1.png]]

---
#### `terraform-aws-github-runner`
- Terraform
- Dynamic Scaling
- EC2 Spot Instances
- Ephemeral
![[CleanShot 2025-08-03 at 19.25.52@2x.png]]
note:
- created by philips
---

#### Hand Rolled 
- Avante Garde
- A Huge Pain
- Running all the time 😵‍💫
![[CleanShot 2025-08-03 at 19.22.31@2x.png]]
---
#### Self Host If
- You need access to private VPC Resources
- More control over cost
- You are willing to accept the operational burden
note:
- callout about security
---
### Actions as Code
---

Scaling workflows across your organization is _hard_

Testing them and validating efficacy is _hard_

---

Write your complex workflows _in code_
- ✅ Testable
- ✅ Readable (bye bye YAML 😉)
- ✅ Maintainable 
---
# Demo

---
`zackerydev/consequences` on GitHub
`https://consequences.dev`

![[CleanShot 2025-08-12 at 17.45.29@2x.png|600]]
---
Thanks to KCDC Sponsors!
![[kcdc25_sponsorslide.jpeg]]
---
## Thank You!

You can find me and my socials on https://zackery.dev

Session Feedback

![[2025_SessionFeedback.png|300]]
