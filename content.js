(function publishFieldGuideData() {
  "use strict";

  function deepFreeze(value, seen) {
    if (value === null || typeof value !== "object") {
      return value;
    }

    const visited = seen || new WeakSet();
    if (visited.has(value)) {
      return value;
    }
    visited.add(value);

    Reflect.ownKeys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key], visited);
    });
    return Object.freeze(value);
  }

  const data = {
    meta: {
      title: "Production Systems Field Guide",
      subtitle: "From interview diagrams to reliable software",
      version: "1.0.0",
      editorialNote:
        "Original public synthesis focused on invariants, bounded resources, failure behavior, and operational proof. No checklist can guarantee a defect-free system.",
      topicOrder: [
        "product",
        "correctness",
        "capacity",
        "data",
        "distributed-systems",
        "reliability",
        "runtime",
        "security",
        "operations",
        "judgment"
      ]
    },

    modules: [
      {
        id: "product-contract-invariants",
        title: "Product Contract and Invariants",
        purpose:
          "Translate a broad product idea into measurable outcomes and correctness conditions before selecting infrastructure.",
        concepts: [
          {
            name: "User outcome",
            explanation:
              "Define success as valuable work completed by a user, not as a collection of healthy components.",
            decisionQuestion: "Which user workflow must finish, and within what bound?"
          },
          {
            name: "Scope and non-goals",
            explanation:
              "Contain the design by separating essential workflows from deliberate exclusions and future concerns.",
            decisionQuestion: "Which tempting requirement is intentionally outside this release?"
          },
          {
            name: "Service-level objective",
            explanation:
              "Name the population, measurement window, success predicate, and exclusions for latency, availability, freshness, and durability.",
            decisionQuestion: "What precise observation proves that the service met its promise?"
          },
          {
            name: "Invariant",
            explanation:
              "State a condition that must survive concurrency, retries, crashes, failover, deployment, and recovery.",
            decisionQuestion: "What must remain true even when the happy path is interrupted?"
          },
          {
            name: "Owner and atomic boundary",
            explanation:
              "Assign each invariant to one authority and identify the transaction, unique constraint, state transition, or ownership token that enforces it.",
            decisionQuestion: "Which operation has enough authority to make this guarantee?"
          },
          {
            name: "Residual risk",
            explanation:
              "Record what is not guaranteed, why the gap is accepted, who owns it, and what would trigger a redesign.",
            decisionQuestion: "Which plausible failure remains after the chosen control?"
          }
        ],
        interviewLens: [
          "Clarify primary workflows, scale, consistency, and non-goals before drawing components.",
          "State two or three load-bearing invariants and connect each to an enforcement boundary.",
          "Use precise guarantees such as per-key ordering or recoverable after acknowledgment instead of broad labels."
        ],
        productionLens: [
          "Connect every SLO to a dashboard query, alert owner, and safe breaking test.",
          "Keep an invariant register containing owner, retry behavior, recovery source, and proof artifact.",
          "Review residual risks after major traffic, schema, dependency, or organizational changes."
        ],
        drill: {
          prompt:
            "Specify a seat-booking service before drawing it. Include workflows, non-goals, no-oversell, payment ambiguity, latency, and durability.",
          deliverable: "A product contract plus an invariant table with breaking tests.",
          passCriteria: [
            "Every invariant has one owner and enforcement boundary.",
            "The payment timeout is represented as an ambiguous outcome.",
            "SLOs contain measurable populations and windows."
          ]
        },
        resourceIds: ["sre-book", "sre-workbook", "aws-builders-library", "adr-guide"]
      },
      {
        id: "minimal-architecture-capacity",
        title: "Minimal Architecture and Capacity",
        purpose:
          "Build the smallest system that satisfies the contract, then evolve it only when scale, isolation, ownership, or deployment constraints force a boundary.",
        concepts: [
          {
            name: "Component responsibility",
            explanation:
              "Every service, queue, cache, and database must have one clear job that cannot be handled more simply.",
            decisionQuestion: "Which requirement forces this component to exist?"
          },
          {
            name: "Workload envelope",
            explanation:
              "Model average, peak, burst, growth, skew, fan-out, payload distribution, and retention separately.",
            decisionQuestion: "What is the worst credible combination of load dimensions?"
          },
          {
            name: "Unit capacity",
            explanation:
              "Measure one service unit with realistic requests and data until its first SLO breach.",
            decisionQuestion: "Which resource saturates first and at what observed load?"
          },
          {
            name: "Downstream amplification",
            explanation:
              "One user request can create multiple database queries, messages, provider calls, and connection demands.",
            decisionQuestion: "How much stateful work does one frontend request multiply into?"
          },
          {
            name: "Fleet-wide budget",
            explanation:
              "A safe per-instance pool or retry limit may become unsafe when multiplied by the fleet.",
            decisionQuestion: "What is the aggregate limit after scaling and failover?"
          },
          {
            name: "Recovery capacity",
            explanation:
              "Reserve throughput above ongoing arrivals so an outage backlog can actually clear.",
            decisionQuestion: "How long does catch-up take with one failure domain absent?"
          }
        ],
        interviewLens: [
          "Estimate with units and make uncertainty explicit.",
          "Identify the first stateful bottleneck before proposing stateless autoscaling.",
          "Start with one simple deployment and add scale mechanisms at named thresholds."
        ],
        productionLens: [
          "Load-test realistic request and data distributions, not only synthetic averages.",
          "Retain latency percentiles, saturation, errors, queue age, memory, disk, and dependency metrics.",
          "Repeat capacity tests after changes to schema, indexes, hardware, models, or dependencies."
        ],
        drill: {
          prompt:
            "Capacity-plan a notification platform with transactional and bulk traffic during a provider outage.",
          deliverable: "A workload model, saturation experiment, and backlog recovery calculation.",
          passCriteria: [
            "Peak and burst are modeled separately.",
            "Connection and retry budgets are global, not only per instance.",
            "Recovered capacity exceeds ongoing arrival rate."
          ]
        },
        resourceIds: [
          "aws-timeouts-retries",
          "google-tail-at-scale",
          "hdr-histogram",
          "prometheus-instrumentation"
        ]
      },
      {
        id: "data-consistency-lifecycle",
        title: "Data Ownership, Consistency, and Lifecycle",
        purpose:
          "Choose data models and storage mechanisms from access paths, correctness boundaries, recovery needs, and long-term lifecycle cost.",
        concepts: [
          {
            name: "Authoritative state",
            explanation:
              "Name the durable owner of each datum and treat caches, replicas, indexes, and views as derived copies.",
            decisionQuestion: "Which record wins when copies disagree?"
          },
          {
            name: "Derived-state contract",
            explanation:
              "Every secondary copy needs a freshness bound, update trigger, missing behavior, and rebuild source.",
            decisionQuestion: "How is this copy repaired after it is lost or stale?"
          },
          {
            name: "Operation-level consistency",
            explanation:
              "Select transaction and read guarantees for each workflow rather than describing an entire database with one adjective.",
            decisionQuestion: "Which anomaly would violate this specific operation?"
          },
          {
            name: "Partition locality",
            explanation:
              "Choose keys that keep dominant reads, writes, and transactions on one owner whenever possible.",
            decisionQuestion: "Which important operation becomes cross-shard?"
          },
          {
            name: "Immutable publication",
            explanation:
              "Build and validate a new version, then publish with an atomic pointer change while retaining rollback.",
            decisionQuestion: "Can any reader observe a partially built artifact?"
          },
          {
            name: "Tiered lifecycle",
            explanation:
              "Retention, hot storage, archival, deletion, compaction, and audit retrieval are separate policies.",
            decisionQuestion: "Which old data must remain queryable but need not stay on the hot path?"
          }
        ],
        interviewLens: [
          "Explain why the key and schema match the access paths.",
          "Name the source of truth and behavior for stale or missing derived copies.",
          "Describe both ownership placement and the protocol for moving ownership."
        ],
        productionLens: [
          "Restore the authoritative store independently and measure RPO and RTO.",
          "Rebuild every derived store from an empty environment and compare checksums.",
          "Use expand, migrate, verify, and contract for schema changes."
        ],
        drill: {
          prompt:
            "Design a live shard migration while reads and writes continue.",
          deliverable:
            "An ownership state machine covering snapshot, change capture, lag, cutover, verification, rollback, and cleanup.",
          passCriteria: [
            "Source and destination use versioned ownership epochs.",
            "Stale routers and writers are rejected after cutover.",
            "Old data is deleted only after independent verification."
          ]
        },
        resourceIds: [
          "postgres-isolation",
          "postgres-locking",
          "postgres-select",
          "kafka-design",
          "sqlite-wal",
          "google-bigtable-paper"
        ]
      },
      {
        id: "async-delivery-side-effects",
        title: "Asynchronous Work and Side Effects",
        purpose:
          "Design replay-safe workflows when queues, retries, external providers, and independent commits create duplicate or ambiguous outcomes.",
        concepts: [
          {
            name: "At-least-once delivery",
            explanation:
              "Assume a message or request may be delivered again after a timeout, crash, or acknowledgment loss.",
            decisionQuestion: "What happens when the same operation runs twice?"
          },
          {
            name: "Idempotency boundary",
            explanation:
              "Use a stable semantic key and a durable uniqueness boundary around the protected local mutation.",
            decisionQuestion: "Which exact side effect does this key suppress?"
          },
          {
            name: "Transactional outbox",
            explanation:
              "Commit business state and an event record together, then publish asynchronously with replay-safe consumers.",
            decisionQuestion: "Can one system commit while the other does not?"
          },
          {
            name: "Ordering scope",
            explanation:
              "Specify whether order is per key, partition, producer, session, or stream, and avoid implying a total order.",
            decisionQuestion: "Which reorderings are legal and which violate product semantics?"
          },
          {
            name: "Durable job resource",
            explanation:
              "Represent long work with a stable job identity, persisted status, result, cancellation, and expiry.",
            decisionQuestion: "Can a client retry without repeating the expensive work?"
          },
          {
            name: "Ambiguous provider outcome",
            explanation:
              "A provider may accept a request even when the caller sees a timeout, reset, or crash.",
            decisionQuestion: "How is accepted distinguished from unknown after handoff?"
          }
        ],
        interviewLens: [
          "Draw the crash point between side effect and acknowledgment.",
          "State exactly which boundary is idempotent and which still permits ambiguity.",
          "Explain the outbox and consumer replay path rather than claiming global exactly-once execution."
        ],
        productionLens: [
          "Kill workers before commit, after commit, after the side effect, and before acknowledgment.",
          "Track attempt count, deduplication decisions, outbox age, redelivery, and reconciliation lag.",
          "Use explicit accepted, negative, retryable, terminal, and unknown provider states."
        ],
        drill: {
          prompt:
            "Design a payment or email worker whose provider can accept a request and then time out.",
          deliverable: "A state machine and provider contract matrix.",
          passCriteria: [
            "The operation key remains stable across retries.",
            "Unknown work is pinned to the original provider.",
            "The design states what cannot be guaranteed without provider support."
          ]
        },
        resourceIds: ["stripe-idempotency", "kafka-design", "aws-timeouts-retries", "sre-workbook"]
      },
      {
        id: "coordination-partitioning-migration",
        title: "Coordination, Partitioning, and Migration",
        purpose:
          "Separate failure detection, leadership, authority, routing, and data movement so stale actors cannot silently corrupt state.",
        concepts: [
          {
            name: "Failure detector",
            explanation:
              "Timeouts and heartbeats provide suspicions under explicit timing assumptions, not proof that an actor is dead.",
            decisionQuestion: "How does a false positive affect safety and availability?"
          },
          {
            name: "Leader election",
            explanation:
              "Election chooses a preferred coordinator but does not by itself revoke a previous coordinator.",
            decisionQuestion: "Who issues the next ownership epoch?"
          },
          {
            name: "Fencing token",
            explanation:
              "A protected resource validates a monotonic epoch and rejects mutations from stale owners.",
            decisionQuestion: "Where is stale authority rejected?"
          },
          {
            name: "Push plus reconciliation",
            explanation:
              "Push minimizes propagation delay while polling or replay closes missed-update gaps.",
            decisionQuestion: "What bounds the duration of a missed push?"
          },
          {
            name: "Placement versus migration",
            explanation:
              "A routing algorithm selects an owner, while a separate protocol copies data, captures changes, cuts over, and cleans up.",
            decisionQuestion: "How do live writes reach the destination during movement?"
          },
          {
            name: "Hot-key isolation",
            explanation:
              "Measure skew and isolate hot tenants, keys, or ranges rather than assuming uniform partition load.",
            decisionQuestion: "Which single owner can saturate despite balanced data volume?"
          }
        ],
        interviewLens: [
          "Distinguish failure detection, election, and revocation in the design narrative.",
          "Show where epochs are created, persisted, transported, and validated.",
          "Describe migration as phases with rollback and stale-router handling."
        ],
        productionLens: [
          "Partition an old leader from coordination while leaving it connected to the protected resource.",
          "Pause a lease holder beyond expiry and resume it after a new owner starts.",
          "Move a shard under load and crash every participant at each phase boundary."
        ],
        drill: {
          prompt:
            "Design a configuration control plane with low-latency propagation and bounded convergence after missed updates.",
          deliverable: "Version, leadership, fencing, push, reconciliation, and rollback protocols.",
          passCriteria: [
            "A stale coordinator cannot publish accepted mutations.",
            "Missed pushes converge within a measurable bound.",
            "Coordination-store unavailability has defined behavior."
          ]
        },
        resourceIds: [
          "raft-paper",
          "distributed-systems-course",
          "jepsen-analyses",
          "aws-static-stability",
          "amazon-dynamo-paper"
        ]
      },
      {
        id: "overload-resilience-recovery",
        title: "Overload, Degradation, and Recovery",
        purpose:
          "Make resource limits, rejection, fallback, backlog recovery, and disaster behavior explicit before pressure chooses them accidentally.",
        concepts: [
          {
            name: "Bounded admission",
            explanation:
              "Every queue, pool, retry loop, buffer, transaction, and in-flight set needs soft and hard limits.",
            decisionQuestion: "What is rejected first when capacity is exhausted?"
          },
          {
            name: "Backpressure",
            explanation:
              "Consumers signal sustainable demand so producers cannot create unbounded queued work.",
            decisionQuestion: "Where does pressure stop propagating upstream?"
          },
          {
            name: "Retry budget",
            explanation:
              "Assign retries to one layer, use decreasing deadlines and jitter, and cap aggregate retry load.",
            decisionQuestion: "Can this retry amplify the original incident?"
          },
          {
            name: "Graceful degradation",
            explanation:
              "Define which output may be stale, partial, absent, or approximate and for how long.",
            decisionQuestion: "Which fallback still preserves product integrity?"
          },
          {
            name: "Recovery objective",
            explanation:
              "State RPO and RTO with the acknowledgment point and modeled failure domain.",
            decisionQuestion: "Which acknowledged operations can be lost under this exact failure?"
          },
          {
            name: "Regional failover",
            explanation:
              "Include data, capacity, identity, keys, certificates, queues, providers, split-brain prevention, and failback.",
            decisionQuestion: "Which supposedly global dependency still resides in the failed region?"
          }
        ],
        interviewLens: [
          "Choose two high-risk failures and explain containment, user impact, data impact, and recovery.",
          "Give every circuit breaker a product-defined fallback.",
          "Explain why recovered throughput must exceed ongoing arrivals to clear backlog."
        ],
        productionLens: [
          "Measure queue age, rejection, retry, saturation, memory, dependency health, and recovery slope.",
          "Restore onto an empty environment and rebuild derived state instead of checking only backup existence.",
          "Run destructive faults only inside a disposable environment or an authorized bounded game day."
        ],
        drill: {
          prompt:
            "Slow the primary database while holding normal arrival rate, then remove one service unit during the backlog.",
          deliverable: "An admission, degradation, retry, alerting, and recovery plan.",
          passCriteria: [
            "Memory and queues remain bounded.",
            "The system avoids retry amplification.",
            "User and data effects match the declared contract."
          ]
        },
        resourceIds: [
          "sre-book",
          "aws-timeouts-retries",
          "principles-chaos",
          "toxiproxy",
          "testcontainers",
          "azure-well-architected"
        ]
      },
      {
        id: "protocol-runtime-durability",
        title: "Protocol, Runtime, Memory, and Durability",
        purpose:
          "Connect high-level guarantees to byte streams, event-loop fairness, memory accounting, shutdown cutoffs, append behavior, and crash recovery.",
        concepts: [
          {
            name: "Incremental framing",
            explanation:
              "A byte-stream read may contain a prefix, one frame, several frames, or complete frames followed by a partial suffix.",
            decisionQuestion: "How many bytes were consumed, and what remains buffered?"
          },
          {
            name: "Partial write",
            explanation:
              "A nonblocking write may send only a prefix, so ordered reply state must retain an exact offset.",
            decisionQuestion: "Can a slow client grow output memory without bound?"
          },
          {
            name: "Event-loop fairness",
            explanation:
              "Cap bytes read, frames parsed, commands executed, and bytes written per client and globally per turn.",
            decisionQuestion: "Can one pipeline starve control work or small clients?"
          },
          {
            name: "Shutdown cutoff",
            explanation:
              "Stop admission, freeze accepted input, drain bounded work, reach the durability promise, flush replies to a deadline, and terminate.",
            decisionQuestion: "Which bytes count as accepted work when shutdown begins?"
          },
          {
            name: "Memory accounting gap",
            explanation:
              "Logical bytes can differ from resident memory because of fragmentation, allocator arenas, buffers, delayed freeing, and copy-on-write.",
            decisionQuestion: "Which metric represents the actual scarce host resource?"
          },
          {
            name: "Durability sequence",
            explanation:
              "Separate prepared, appended, applied, durable, and acknowledged positions and define recovery for each crash point.",
            decisionQuestion: "At which exact position may success be returned?"
          }
        ],
        interviewLens: [
          "Treat network servers as incremental bounded state machines.",
          "Explain how per-turn fairness and buffer caps protect availability.",
          "Describe persistence as an acknowledgment and recovery contract, not as file syntax."
        ],
        productionLens: [
          "Split valid frames at every byte boundary, concatenate frames, force partial writes, and stall one client.",
          "Crash at every append, apply, synchronization, response, and recovery checkpoint.",
          "Track both logical memory and resident memory under realistic allocation patterns."
        ],
        drill: {
          prompt:
            "Specify a small append-only protocol server with pipelining and graceful shutdown.",
          deliverable: "Connection, shutdown, persistence, and recovery state machines.",
          passCriteria: [
            "Partial I/O preserves exact offsets and reply order.",
            "All buffers and per-turn work are bounded.",
            "Recovery equals the declared durable prefix."
          ]
        },
        resourceIds: [
          "rfc-9293",
          "linux-epoll",
          "linux-signalfd",
          "linux-eventfd",
          "beej-networking",
          "redis-pipelining"
        ]
      },
      {
        id: "security-tenancy-regions",
        title: "Security, Tenancy, Supply Chain, and Regions",
        purpose:
          "Make identity, authorization, isolation, credential lifecycle, artifact provenance, and regional survival testable parts of architecture.",
        concepts: [
          {
            name: "Trusted identity",
            explanation:
              "Authenticate human, workload, tenant, and operator identities at a trusted boundary.",
            decisionQuestion: "Which principal is acting, and how is that claim verified?"
          },
          {
            name: "Server-side authorization",
            explanation:
              "Enforce every object read and mutation at the trusted service, not only in a client or user interface.",
            decisionQuestion: "Which server rejects an unauthorized object operation?"
          },
          {
            name: "Tenant propagation",
            explanation:
              "Carry tenant identity through cache keys, storage ownership, queues, logs, and background jobs.",
            decisionQuestion: "Can any derived path omit the tenant dimension?"
          },
          {
            name: "Credential lifecycle",
            explanation:
              "Secrets, signing keys, encryption keys, and certificates need issuance, overlap, rotation, revocation, expiry alarms, and recovery.",
            decisionQuestion: "How quickly does a compromised credential stop working?"
          },
          {
            name: "Artifact provenance",
            explanation:
              "Inventory dependencies, sign immutable artifacts, and verify provenance at deployment.",
            decisionQuestion: "How does the runtime know who built this artifact from which source?"
          },
          {
            name: "Regional dependency inventory",
            explanation:
              "Disaster recovery depends on traffic, identity, key management, queues, certificates, providers, capacity, and failback, not only replicated rows.",
            decisionQuestion: "Can the recovery region operate with the primary region fully absent?"
          }
        ],
        interviewLens: [
          "Add a trust-boundary pass after the main read and write paths.",
          "Name identity, authorization, tenant isolation, secret handling, and abuse controls.",
          "For regional claims, list critical recovery-region dependencies and old-writer fencing."
        ],
        productionLens: [
          "Test cross-tenant denial, revocation, rotation, encrypted restore, and audit integrity.",
          "Reject unsigned or wrong-provenance artifacts before deployment.",
          "Exercise authorized regional failover, reconciliation, and failback while measuring RPO and RTO."
        ],
        drill: {
          prompt:
            "Threat-model a multi-tenant object-sharing service with public, unlisted, and private objects.",
          deliverable: "A trust map, abuse model, credential lifecycle, and regional recovery test.",
          passCriteria: [
            "Unlisted access is not treated as authenticated privacy.",
            "Tenant isolation covers caches and background work.",
            "Credential and regional claims have executable tests."
          ]
        },
        resourceIds: [
          "owasp-asvs",
          "owasp-authentication",
          "nist-zero-trust",
          "slsa",
          "sigstore",
          "gcp-architecture-framework"
        ]
      },
      {
        id: "observability-delivery-incidents",
        title: "Observability, Delivery, and Incident Learning",
        purpose:
          "Operate architecture through user-level signals, staged change, executable rollback, recovery drills, and mechanism-focused incident learning.",
        concepts: [
          {
            name: "Outcome-first observability",
            explanation:
              "Measure successful workflows before deadline, then decompose failures into component signals.",
            decisionQuestion: "Can every component be green while the user still fails?"
          },
          {
            name: "High-cardinality context",
            explanation:
              "Carry request, tenant, operation, version, ownership epoch, and relevant sequence identifiers through telemetry.",
            decisionQuestion: "Can one trace explain the exact state and artifact involved?"
          },
          {
            name: "Actionable alert",
            explanation:
              "An alert must identify a user risk, an owner, and a runbook action rather than only a noisy threshold.",
            decisionQuestion: "What must the responder decide after this page?"
          },
          {
            name: "Immutable rollout",
            explanation:
              "Deploy versioned artifacts through shadowing, canaries, bounded cohorts, automatic thresholds, drain, and rollback.",
            decisionQuestion: "Can the previous known-good version be restored quickly?"
          },
          {
            name: "Compatible migration",
            explanation:
              "Readers become compatible before writers emit new forms, and destructive cleanup waits for verification.",
            decisionQuestion: "Which rollback becomes impossible after contraction?"
          },
          {
            name: "Mechanism-focused review",
            explanation:
              "Incidents should identify the first violated contract, trigger, amplifiers, containment gaps, and permanent proof improvement.",
            decisionQuestion: "Which test, alert, or invariant changes because of this incident?"
          }
        ],
        interviewLens: [
          "End designs with user-level SLIs, a canary plan, rollback, restore, and ownership.",
          "Mention queue age and replication sequence distance, not only queue depth and replica health.",
          "Describe how a design decision would be falsified in production."
        ],
        productionLens: [
          "Attach exact code, config, data, and environment versions to readiness artifacts.",
          "Run old and new versions together, stop and resume backfills, and exercise rollback.",
          "Make each incident produce a durable design, test, observability, or runbook improvement."
        ],
        drill: {
          prompt:
            "Investigate a recurring latency event where host dashboards remain healthy but a user workflow misses its deadline.",
          deliverable: "An SLI tree, telemetry plan, hypotheses, separating experiments, and rollback-safe fix.",
          passCriteria: [
            "The top signal measures completed user work.",
            "Trigger and amplifier are treated as separate hypotheses.",
            "The permanent action has a verifiable gate."
          ]
        },
        resourceIds: [
          "opentelemetry-docs",
          "prometheus-instrumentation",
          "google-dapper-paper",
          "sre-workbook",
          "kubernetes-pod-termination",
          "kubernetes-pdb"
        ]
      },
      {
        id: "judgment-interview-synthesis",
        title: "Engineering Judgment and Interview Synthesis",
        purpose:
          "Combine correctness, scale, reliability, security, operations, cost, and organizational ownership into clear decisions rather than technology catalogs.",
        concepts: [
          {
            name: "Smallest justified system",
            explanation:
              "Prefer the least complex architecture that meets current constraints and leaves a credible evolution path.",
            decisionQuestion: "What complexity disappears if this component is removed?"
          },
          {
            name: "Build versus buy",
            explanation:
              "Include staff expertise, on-call burden, control, compliance, migration, and vendor dependence alongside invoice cost.",
            decisionQuestion: "Which operational capability would the team need to own?"
          },
          {
            name: "Approximation boundary",
            explanation:
              "State error direction, envelope, unsupported operations, product consequence, and exact rebuild source.",
            decisionQuestion: "Can this approximate result influence an exact safety decision?"
          },
          {
            name: "Evidence envelope",
            explanation:
              "A benchmark supports only the workload, environment, distribution, and metrics it actually measured.",
            decisionQuestion: "What important production behavior does this test omit?"
          },
          {
            name: "Decision record",
            explanation:
              "Preserve context, options, chosen mechanism, evidence, consequences, residual risk, owner, and revisit trigger.",
            decisionQuestion: "Which observation would make another option better?"
          },
          {
            name: "Communication under constraint",
            explanation:
              "Lead with product semantics, make assumptions explicit, focus depth on the riskiest boundaries, and conclude with proof and residual risk.",
            decisionQuestion: "What is the one trade-off the reviewer must remember?"
          }
        ],
        interviewLens: [
          "Use a contract-to-invariant-to-mechanism-to-proof narrative.",
          "Prefer two deeply reasoned failure paths over a long list of named technologies.",
          "Finish with rejected alternatives and one honest residual risk."
        ],
        productionLens: [
          "Review whether every boundary still earns its operational cost.",
          "Use architecture decisions with measurable revisit triggers.",
          "Teach mechanisms through design reviews, game days, incident reviews, and small runnable labs."
        ],
        drill: {
          prompt:
            "Compare managed and self-hosted cache options for a growing service.",
          deliverable: "A decision record with workload, controls, operating model, migration path, and revisit threshold.",
          passCriteria: [
            "The decision includes people and incident cost.",
            "Capacity claims have an evidence envelope.",
            "Residual risks and reversal path are explicit."
          ]
        },
        resourceIds: [
          "software-engineering-google",
          "google-engineering-practices",
          "adr-guide",
          "c4-model",
          "twelve-factor"
        ]
      }
    ],

    patterns: [
      {
        id: "fleet-local-limits",
        title: "Local Limits Multiply Across the Fleet",
        symptom:
          "A stateful dependency degrades immediately after frontend autoscaling even though each caller respects its local pool and concurrency settings.",
        hiddenMechanism:
          "Instance count multiplies local connections, retries, and fan-out beyond the dependency's global budget.",
        saferDesign:
          "Budget scarce resources globally, cap admission near the caller, and scale the stateful dependency before adding demand.",
        verification:
          "Load-test at maximum planned fleet size with one dependency unit absent and inspect aggregate connections, queue wait, and rejection.",
        interviewLine: "Local safety limits do not imply fleet safety.",
        transferLimit:
          "A shared proxy can reduce connection count, but it adds its own saturation, affinity, and failure behavior.",
        topics: ["capacity", "overload", "databases"]
      },
      {
        id: "long-work-retried",
        title: "Long Synchronous Work Repeats After Timeout",
        symptom:
          "Expensive work continues after the client disconnects, and a retry starts a second copy.",
        hiddenMechanism:
          "The request lacks durable identity, and disconnect may be discovered only when the response is written.",
        saferDesign:
          "Create a durable job with a semantic operation key, persisted status, stored result, cancellation rules, and polling or subscription.",
        verification:
          "Disconnect and retry at several execution points, then prove one logical job owns the result and resource use stays bounded.",
        interviewLine: "Long work is a durable workflow, not one fragile request.",
        transferLimit:
          "Very short, naturally idempotent operations may not justify a persistent job system.",
        topics: ["async", "idempotency", "capacity"]
      },
      {
        id: "push-without-reconciliation",
        title: "Push Propagation Is Mistaken for Convergence",
        symptom:
          "Most nodes update quickly, but one missed receiver remains stale indefinitely.",
        hiddenMechanism:
          "The low-latency push path has no versioned pull, replay, or audit path for repair.",
        saferDesign:
          "Attach monotonic versions and combine push with periodic reconciliation or durable replay.",
        verification:
          "Drop selected notifications and prove every node converges within the declared staleness bound.",
        interviewLine: "Push is the fast path; reconciliation is the repair path.",
        transferLimit:
          "For immutable best-effort hints, permanent convergence may not be worth its cost.",
        topics: ["distributed-systems", "consistency", "reliability"]
      },
      {
        id: "lease-without-fencing",
        title: "Lease Expiry Does Not Revoke an Old Actor",
        symptom:
          "A paused worker resumes after a replacement starts, and both mutate the protected resource.",
        hiddenMechanism:
          "Lease acquisition grants a new owner but the data plane has no way to reject the stale owner.",
        saferDesign:
          "Issue monotonic fencing epochs and validate them at the resource that applies mutations.",
        verification:
          "Pause the old owner beyond expiry, start a new owner, resume the old process, and assert stale writes are rejected.",
        interviewLine: "Detection, election, and authority revocation are separate mechanisms.",
        transferLimit:
          "Fencing cannot protect an external resource that has no conditional or version-aware write interface.",
        topics: ["coordination", "concurrency", "correctness"]
      },
      {
        id: "placement-not-migration",
        title: "Placement Is Confused with Migration",
        symptom:
          "Routing metadata points at a new owner while data and live writes remain split between old and new locations.",
        hiddenMechanism:
          "The placement algorithm has no snapshot, change capture, lag, cutover, fencing, or cleanup protocol.",
        saferDesign:
          "Move ownership through versioned phases with snapshot, concurrent-change capture, measured lag, fenced cutover, verification, rollback, and delayed deletion.",
        verification:
          "Crash the source, destination, router, and coordinator at every migration phase while traffic continues.",
        interviewLine: "A routing function does not move data.",
        transferLimit:
          "Stateless or fully recomputable partitions may use a simpler replacement procedure.",
        topics: ["partitioning", "migration", "data"]
      },
      {
        id: "claim-not-execution",
        title: "Unique Claiming Is Confused with Exactly-Once Execution",
        symptom:
          "A task is claimed once in a database, yet downstream work is missing or duplicated.",
        hiddenMechanism:
          "The claim transaction and broker publication or external side effect do not share an atomic boundary.",
        saferDesign:
          "Use a transactional outbox for publication, replay-safe consumers, durable idempotency, and reconciliation.",
        verification:
          "Crash after claim, after outbox commit, after publication, after side effect, and before acknowledgment.",
        interviewLine: "Name the exact boundary of every exactly-once claim.",
        transferLimit:
          "An outbox closes a local database-plus-publication gap but cannot eliminate ambiguity inside an unsupported external provider.",
        topics: ["queues", "transactions", "idempotency"]
      },
      {
        id: "timeout-is-unknown",
        title: "External Timeout Is Treated as Proof of Failure",
        symptom:
          "A protected action is performed twice after the first provider accepts but its response is lost.",
        hiddenMechanism:
          "A post-handoff timeout is ambiguous, yet retry logic classifies it as a definitive negative.",
        saferDesign:
          "Persist pre-call state and provider selection, pin unknown work, and reconcile through authoritative status or durable provider idempotency.",
        verification:
          "Use a fake provider that accepts once and then times out, and prove no unsafe cross-provider retry occurs.",
        interviewLine: "Uncertainty is a state, not an error code.",
        transferLimit:
          "If the provider offers neither idempotency nor status lookup, eventual retry and never-duplicate cannot both be guaranteed.",
        topics: ["external-effects", "idempotency", "correctness"]
      },
      {
        id: "priority-inversion",
        title: "Urgent Work Waits Behind Bulk Traffic",
        symptom:
          "A large low-priority backlog violates the latency target of critical work sharing the same queue.",
        hiddenMechanism:
          "Queue ordering ignores traffic-class SLOs, tenant fairness, and reserved recovery capacity.",
        saferDesign:
          "Isolate service classes, reserve strict capacity, and use bounded fair scheduling within each class.",
        verification:
          "Saturate bulk traffic while submitting critical work from several tenants and measure oldest-item age by class and tenant.",
        interviewLine: "Queue age is an SLO by class and tenant.",
        transferLimit:
          "Strict priority can starve lower classes, so every class still needs a progress policy.",
        topics: ["queues", "fairness", "slo"]
      },
      {
        id: "cache-before-locality",
        title: "Caching Precedes Locality Evidence",
        symptom:
          "An expensive cache stores many objects that receive little reuse and provides a weak hit ratio.",
        hiddenMechanism:
          "The design assumes a hot distribution without measuring access frequency, object size, or miss cost.",
        saferDesign:
          "Serve from the durable source first, measure locality, then cache the working set with explicit freshness and rebuild behavior.",
        verification:
          "Replay representative access traces and compare latency, source load, memory, and cost with and without the cache.",
        interviewLine: "A cache is a cost center until locality is proven.",
        transferLimit:
          "A small cache may still be justified for dependency isolation even when direct cost savings are modest.",
        topics: ["cache", "capacity", "cost"]
      },
      {
        id: "green-components-failed-product",
        title: "Healthy Components Produce an Unavailable Product",
        symptom:
          "Host and dependency dashboards are green while users miss the workflow deadline.",
        hiddenMechanism:
          "Monitoring measures component liveness rather than successful end-to-end work, often hiding skew or tail latency.",
        saferDesign:
          "Define user-level SLIs first, then connect them to hop latency, saturation, errors, and quality floors.",
        verification:
          "Create a hot shard or slow dependency that leaves fleet averages healthy and assert the workflow SLI detects it.",
        interviewLine: "Availability is successful user work within the SLO.",
        transferLimit:
          "Component telemetry remains essential for diagnosis after the product-level signal finds impact.",
        topics: ["observability", "slo", "tail-latency"]
      },
      {
        id: "retention-on-hot-path",
        title: "Retained History Remains on the Hot Path",
        symptom:
          "Primary indexes and maintenance costs grow even though most old records are accessed only for audit.",
        hiddenMechanism:
          "A retention requirement is interpreted as a requirement for hot transactional storage.",
        saferDesign:
          "Tier aged records to cheaper queryable storage with integrity checks, a retrieval SLO, deletion rules, and tested restore.",
        verification:
          "Move a representative aged partition, validate audit queries and hashes, then measure primary index and latency effects.",
        interviewLine: "Retention does not mean hot retention.",
        transferLimit:
          "Data needed for frequent cross-period transactions may remain hot despite its age.",
        topics: ["storage", "lifecycle", "cost"]
      },
      {
        id: "custom-control-plane",
        title: "A New Subsystem Duplicates Operated Machinery",
        symptom:
          "A team builds a bespoke distribution or configuration service for a requirement already satisfied by versioned deployment.",
        hiddenMechanism:
          "Technology choice begins before checking existing ownership, rollout, rollback, and observability capabilities.",
        saferDesign:
          "Reuse an operated mechanism until latency, isolation, scale, or ownership requirements clearly force a new boundary.",
        verification:
          "Compare both options through failure, rollout, rollback, staffing, and recovery exercises, not feature lists alone.",
        interviewLine: "Every component must earn its boundary.",
        transferLimit:
          "Existing machinery should not be stretched beyond its safety or convergence contract merely to avoid change.",
        topics: ["simplicity", "operations", "architecture"]
      },
      {
        id: "transparent-fallback",
        title: "Transparent Fallback Defeats the Architecture",
        symptom:
          "Requests succeed but silently execute on a protected primary or expensive fallback, erasing intended isolation.",
        hiddenMechanism:
          "The client preserves functional success without exposing execution placement or architectural policy violations.",
        saferDesign:
          "Instrument the actual execution target, make unsafe fallback explicit, and reject or degrade when the invariant matters more than success.",
        verification:
          "Remove the preferred target and assert routing, telemetry, load distribution, and error behavior match the declared policy.",
        interviewLine: "A successful request can hide an architectural failure.",
        transferLimit:
          "Transparent fallback is useful when the fallback preserves every capacity, consistency, and security requirement.",
        topics: ["routing", "observability", "capacity"]
      },
      {
        id: "benchmark-overclaim",
        title: "One Benchmark Becomes a General Capacity Claim",
        symptom:
          "A single local microbenchmark is used to claim mature-system parity or production readiness.",
        hiddenMechanism:
          "The test omits realistic data, concurrency, network, dependencies, resource profiles, repetition, and tail behavior.",
        saferDesign:
          "Define the workload envelope, repeat trials, report distributions and saturation, retain artifacts, and state what remains untested.",
        verification:
          "Change request mix, data distribution, concurrency, network delay, and dependency behavior to test whether the conclusion survives.",
        interviewLine: "A benchmark supports only the workload it measured.",
        transferLimit:
          "Small benchmarks remain valuable for isolating a mechanism when their scope is stated honestly.",
        topics: ["performance", "evidence", "capacity"]
      },
      {
        id: "logical-versus-resident-memory",
        title: "Logical Memory Is Bounded While Resident Memory Grows",
        symptom:
          "Application counters remain below the limit while the process approaches host or cgroup OOM.",
        hiddenMechanism:
          "Fragmentation, allocator arenas, buffers, deferred freeing, and copy-on-write create an accounting gap.",
        saferDesign:
          "Observe logical and resident memory, reserve maintenance headroom, test real allocation patterns, and preflight oversized values.",
        verification:
          "Exercise mixed object sizes, deletion patterns, background freeing, and snapshot or rewrite activity under memory pressure.",
        interviewLine: "Measure the scarce resource and its accounting gap.",
        transferLimit:
          "Resident memory alone cannot explain which logical subsystem owns growth, so both views are required.",
        topics: ["memory", "runtime", "capacity"]
      },
      {
        id: "syntax-not-durability",
        title: "Valid Persistence Syntax Is Confused with Durability",
        symptom:
          "A log file validates successfully, but acknowledged mutations disappear or replay inconsistently after a crash.",
        hiddenMechanism:
          "Append, apply, synchronize, acknowledge, rewrite, and recovery boundaries are not aligned.",
        saferDesign:
          "Define sequence positions and success policy, handle short writes and disk full, frame records, atomically publish rewrites, and prove restore.",
        verification:
          "Crash at every sequence transition, truncate the final record, corrupt a middle record, fill disk, and resume interrupted recovery.",
        interviewLine: "Durability is an acknowledgment plus recovery contract.",
        transferLimit:
          "Different storage hardware and filesystem guarantees require explicit assumptions and may alter the policy.",
        topics: ["durability", "storage", "recovery"]
      },
      {
        id: "byte-stream-framing",
        title: "The Event Loop Trusts Read Boundaries",
        symptom:
          "Split frames, multiple frames, or slow writers cause parse errors, reply corruption, starvation, or unbounded buffers.",
        hiddenMechanism:
          "TCP is treated like a message queue and per-turn parsing, execution, and output work are not bounded.",
        saferDesign:
          "Use incremental parsing with exact offsets, bounded command and reply queues, ordered partial writes, deadlines, and fairness budgets.",
        verification:
          "Split every valid frame at every byte, concatenate frames, force partial writes, and run a large pipeline beside small clients.",
        interviewLine: "Network servers are incremental bounded state machines.",
        transferLimit:
          "Datagram protocols provide message boundaries but still require size, ordering, duplication, and resource controls.",
        topics: ["protocols", "event-loop", "reliability"]
      },
      {
        id: "shutdown-race",
        title: "Graceful Shutdown Races with New Work",
        symptom:
          "The process begins termination, then accepts or partially executes work that cannot finish safely.",
        hiddenMechanism:
          "Admission, state transition, input cutoff, drain, final synchronization, and output flushing have no single protocol.",
        saferDesign:
          "Use atomic phases for quiescing, draining, final sync, bounded output flush, and termination with an explicit accepted-work cutoff.",
        verification:
          "Signal the process while idle, accepting, parsing, executing, committing, and writing to a slow client.",
        interviewLine: "Shutdown is a concurrency protocol.",
        transferLimit:
          "A hard process deadline may conflict with a hung final sync; an external watchdog and explicit trade-off are required.",
        topics: ["shutdown", "concurrency", "durability"]
      },
      {
        id: "lifecycle-derivative-drift",
        title: "A Destructive Operation Forgets Derived Effects",
        symptom:
          "Deleting, expiring, or evicting a record updates primary state but leaves metadata, accounting, logs, replicas, or notifications inconsistent.",
        hiddenMechanism:
          "Lifecycle side effects are scattered across call sites without one owned transition.",
        saferDesign:
          "Centralize the operation, enumerate every derivative, and make each hook replay-safe and observable.",
        verification:
          "Invoke every lifecycle path repeatedly and assert each derivative changes exactly as declared with no missing or duplicate hook.",
        interviewLine: "Derived state creates lifecycle obligations.",
        transferLimit:
          "Asynchronous derivatives may converge later, so tests must use their explicit freshness contract rather than immediate equality.",
        topics: ["derived-state", "lifecycle", "consistency"]
      },
      {
        id: "approximation-exact-boundary",
        title: "Approximation Crosses an Exact Boundary",
        symptom:
          "A probabilistic presence check, ranking, cardinality estimate, or spatial bucket drives an exact safety decision.",
        hiddenMechanism:
          "Error direction, envelope, unsupported operations, and product consequence were never specified.",
        saferDesign:
          "Define the approximation contract, refine exact decisions when required, test adversarial inputs, and preserve an exact rebuild source.",
        verification:
          "Compare with an exact oracle across representative, sequential, clustered, duplicated, and skewed inputs.",
        interviewLine: "Approximation is safe only inside an explicit product boundary.",
        transferLimit:
          "An observed error rate can drift with workload and hashing, so ongoing measurement may be necessary.",
        topics: ["approximation", "data", "correctness"]
      }
    ],

    resources: [
      {
        id: "sre-book",
        title: "Site Reliability Engineering",
        url: "https://sre.google/sre-book/table-of-contents/",
        type: "Free public book",
        topics: ["slo", "reliability", "operations"],
        level: "Foundation",
        description: "Google's public reference on SLOs, monitoring, incident response, capacity, and reliable operations.",
        source: "Google SRE"
      },
      {
        id: "sre-workbook",
        title: "The Site Reliability Workbook",
        url: "https://sre.google/workbook/table-of-contents/",
        type: "Free public workbook",
        topics: ["slo", "alerting", "canary", "operations"],
        level: "Applied",
        description: "Practice-oriented guidance for turning reliability principles into service controls and exercises.",
        source: "Google SRE"
      },
      {
        id: "aws-builders-library",
        title: "Amazon Builders' Library",
        url: "https://aws.amazon.com/builders-library/",
        type: "Engineering library",
        topics: ["distributed-systems", "reliability", "operations"],
        level: "Applied",
        description: "Mechanism-focused articles on operating large services, safe deployment, timeouts, retries, and resilience.",
        source: "Amazon Web Services"
      },
      {
        id: "aws-timeouts-retries",
        title: "Timeouts, Retries, and Backoff with Jitter",
        url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
        type: "Engineering article",
        topics: ["timeouts", "retries", "overload"],
        level: "Applied",
        description: "A concrete treatment of retry amplification, timeout selection, backoff, and jitter.",
        source: "Amazon Web Services"
      },
      {
        id: "aws-static-stability",
        title: "Static Stability Using Availability Zones",
        url: "https://aws.amazon.com/builders-library/static-stability-using-availability-zones/",
        type: "Engineering article",
        topics: ["availability", "regions", "capacity"],
        level: "Advanced",
        description: "Explains architectures that retain service capacity without depending on control-plane changes during failure.",
        source: "Amazon Web Services"
      },
      {
        id: "gcp-architecture-framework",
        title: "Google Cloud Well-Architected Framework",
        url: "https://cloud.google.com/architecture/framework",
        type: "Architecture framework",
        topics: ["reliability", "security", "operations", "cost"],
        level: "Foundation",
        description: "A structured review framework spanning operations, security, reliability, cost, and performance.",
        source: "Google Cloud"
      },
      {
        id: "azure-well-architected",
        title: "Azure Well-Architected Framework",
        url: "https://learn.microsoft.com/azure/well-architected/",
        type: "Architecture framework",
        topics: ["reliability", "security", "operations", "cost"],
        level: "Foundation",
        description: "Official architecture guidance organized around reliability, security, cost, operations, and performance.",
        source: "Microsoft Learn"
      },
      {
        id: "google-engineering-practices",
        title: "Google Engineering Practices Documentation",
        url: "https://google.github.io/eng-practices/",
        type: "Engineering guide",
        topics: ["code-review", "quality", "collaboration"],
        level: "Foundation",
        description: "Public guidance for authoring and reviewing changes with clear engineering standards.",
        source: "Google"
      },
      {
        id: "software-engineering-google",
        title: "Software Engineering at Google",
        url: "https://abseil.io/resources/swe-book",
        type: "Free public book",
        topics: ["software-engineering", "testing", "organization"],
        level: "Applied",
        description: "A broad treatment of sustainable code, testing, review, dependency management, and organizational scale.",
        source: "Google and O'Reilly"
      },
      {
        id: "distributed-systems-course",
        title: "Distributed Systems Course",
        url: "https://www.distributedsystemscourse.com/",
        type: "Free public course",
        topics: ["distributed-systems", "replication", "transactions"],
        level: "Advanced",
        description: "Lecture material covering distributed-system models, replication, broadcast, consensus, and transactions.",
        source: "University of Cambridge course"
      },
      {
        id: "raft-paper",
        title: "In Search of an Understandable Consensus Algorithm",
        url: "https://raft.github.io/raft.pdf",
        type: "Research paper",
        topics: ["consensus", "replication", "coordination"],
        level: "Advanced",
        description: "The original Raft paper, useful for reasoning about replicated logs, terms, elections, and safety.",
        source: "Raft authors"
      },
      {
        id: "jepsen-analyses",
        title: "Jepsen Analyses",
        url: "https://jepsen.io/analyses",
        type: "Public test analyses",
        topics: ["consistency", "fault-testing", "databases"],
        level: "Advanced",
        description: "Public analyses that connect distributed failure experiments to observable consistency behavior.",
        source: "Jepsen"
      },
      {
        id: "kafka-design",
        title: "Apache Kafka Design Documentation",
        url: "https://kafka.apache.org/documentation/#design",
        type: "Official documentation",
        topics: ["logs", "queues", "replication", "delivery"],
        level: "Applied",
        description: "Primary design documentation for Kafka storage, replication, producers, consumers, and delivery semantics.",
        source: "Apache Kafka"
      },
      {
        id: "postgres-isolation",
        title: "PostgreSQL Transaction Isolation",
        url: "https://www.postgresql.org/docs/current/transaction-iso.html",
        type: "Official documentation",
        topics: ["transactions", "isolation", "databases"],
        level: "Applied",
        description: "Primary documentation for isolation levels, phenomena, and PostgreSQL transaction behavior.",
        source: "PostgreSQL"
      },
      {
        id: "postgres-locking",
        title: "PostgreSQL Explicit Locking",
        url: "https://www.postgresql.org/docs/current/explicit-locking.html",
        type: "Official documentation",
        topics: ["locks", "transactions", "concurrency"],
        level: "Applied",
        description: "Reference for table, row, advisory, and deadlock behavior in PostgreSQL.",
        source: "PostgreSQL"
      },
      {
        id: "postgres-select",
        title: "PostgreSQL SELECT and SKIP LOCKED",
        url: "https://www.postgresql.org/docs/current/sql-select.html",
        type: "Official documentation",
        topics: ["work-claiming", "locking", "queues"],
        level: "Advanced",
        description: "Primary syntax and caveats for row-locking SELECT, including NOWAIT and SKIP LOCKED.",
        source: "PostgreSQL"
      },
      {
        id: "stripe-idempotency",
        title: "Stripe Idempotent Requests",
        url: "https://docs.stripe.com/api/idempotent_requests",
        type: "Official documentation",
        topics: ["idempotency", "api", "external-effects"],
        level: "Applied",
        description: "A concrete public provider contract for request idempotency keys and replay behavior.",
        source: "Stripe"
      },
      {
        id: "rfc-9293",
        title: "RFC 9293: Transmission Control Protocol",
        url: "https://www.rfc-editor.org/info/rfc9293/",
        type: "Internet standard",
        topics: ["tcp", "networking", "protocols"],
        level: "Advanced",
        description: "The current core TCP specification, including connection and byte-stream semantics.",
        source: "RFC Editor"
      },
      {
        id: "rfc-9110",
        title: "RFC 9110: HTTP Semantics",
        url: "https://www.rfc-editor.org/info/rfc9110/",
        type: "Internet standard",
        topics: ["http", "api", "caching"],
        level: "Applied",
        description: "The primary standard for HTTP method, status, representation, and caching semantics.",
        source: "RFC Editor"
      },
      {
        id: "linux-epoll",
        title: "Linux epoll Manual",
        url: "https://man7.org/linux/man-pages/man7/epoll.7.html",
        type: "System manual",
        topics: ["event-loop", "linux", "networking"],
        level: "Advanced",
        description: "Reference for epoll readiness, trigger modes, event handling, and common usage concerns.",
        source: "Linux man-pages project"
      },
      {
        id: "linux-signalfd",
        title: "Linux signalfd Manual",
        url: "https://man7.org/linux/man-pages/man2/signalfd.2.html",
        type: "System manual",
        topics: ["signals", "event-loop", "shutdown"],
        level: "Advanced",
        description: "Reference for receiving signals through a file descriptor that can participate in an event loop.",
        source: "Linux man-pages project"
      },
      {
        id: "linux-eventfd",
        title: "Linux eventfd Manual",
        url: "https://man7.org/linux/man-pages/man2/eventfd.2.html",
        type: "System manual",
        topics: ["event-loop", "notification", "linux"],
        level: "Advanced",
        description: "Reference for lightweight event notification and poller wakeup through a file descriptor.",
        source: "Linux man-pages project"
      },
      {
        id: "beej-networking",
        title: "Beej's Guide to Network Programming",
        url: "https://beej.us/guide/bgnet/",
        type: "Free public guide",
        topics: ["sockets", "networking", "protocols"],
        level: "Foundation",
        description: "A practical introduction to sockets, client-server programming, and network APIs.",
        source: "Beej Jorgensen"
      },
      {
        id: "kubernetes-pod-termination",
        title: "Kubernetes Pod Lifecycle and Termination",
        url: "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination",
        type: "Official documentation",
        topics: ["shutdown", "deployment", "kubernetes"],
        level: "Applied",
        description: "Primary documentation for pod termination flow, grace periods, signals, and endpoint removal behavior.",
        source: "Kubernetes"
      },
      {
        id: "kubernetes-pdb",
        title: "Kubernetes Pod Disruption Budgets",
        url: "https://kubernetes.io/docs/tasks/run-application/configure-pdb/",
        type: "Official documentation",
        topics: ["availability", "deployment", "kubernetes"],
        level: "Applied",
        description: "Official guidance for limiting voluntary disruption to replicated workloads.",
        source: "Kubernetes"
      },
      {
        id: "owasp-asvs",
        title: "OWASP Application Security Verification Standard",
        url: "https://owasp.org/www-project-application-security-verification-standard/",
        type: "Security standard",
        topics: ["security", "verification", "application"],
        level: "Applied",
        description: "A structured set of security requirements and verification objectives for applications.",
        source: "OWASP"
      },
      {
        id: "owasp-authentication",
        title: "OWASP Authentication Cheat Sheet",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
        type: "Security guide",
        topics: ["authentication", "identity", "security"],
        level: "Foundation",
        description: "Practical guidance for authentication controls, failure behavior, and session-adjacent concerns.",
        source: "OWASP"
      },
      {
        id: "nist-zero-trust",
        title: "NIST SP 800-207: Zero Trust Architecture",
        url: "https://csrc.nist.gov/publications/detail/sp/800-207/final",
        type: "Public standard",
        topics: ["identity", "authorization", "security"],
        level: "Advanced",
        description: "A public architecture model for resource-focused trust decisions and continuous verification.",
        source: "NIST"
      },
      {
        id: "slsa",
        title: "Supply-chain Levels for Software Artifacts",
        url: "https://slsa.dev/",
        type: "Security framework",
        topics: ["supply-chain", "provenance", "security"],
        level: "Applied",
        description: "A framework for increasing confidence in build provenance and software supply-chain integrity.",
        source: "SLSA project"
      },
      {
        id: "sigstore",
        title: "Sigstore Documentation",
        url: "https://docs.sigstore.dev/",
        type: "Official project documentation",
        topics: ["signing", "provenance", "supply-chain"],
        level: "Applied",
        description: "Primary documentation for signing, verifying, and recording software-artifact identity.",
        source: "Sigstore"
      },
      {
        id: "opentelemetry-docs",
        title: "OpenTelemetry Documentation",
        url: "https://opentelemetry.io/docs/",
        type: "Official project documentation",
        topics: ["tracing", "metrics", "logs", "observability"],
        level: "Applied",
        description: "Primary guidance for telemetry signals, instrumentation, semantic conventions, and context propagation.",
        source: "OpenTelemetry"
      },
      {
        id: "prometheus-instrumentation",
        title: "Prometheus Instrumentation Practices",
        url: "https://prometheus.io/docs/practices/instrumentation/",
        type: "Official project documentation",
        topics: ["metrics", "instrumentation", "observability"],
        level: "Applied",
        description: "Guidance for choosing metrics and instrumenting services, batches, and online systems.",
        source: "Prometheus"
      },
      {
        id: "hdr-histogram",
        title: "HdrHistogram",
        url: "https://hdrhistogram.github.io/HdrHistogram/",
        type: "Official project documentation",
        topics: ["latency", "measurement", "performance"],
        level: "Advanced",
        description: "A high-dynamic-range histogram for retaining useful latency distributions without averaging away tails.",
        source: "HdrHistogram project"
      },
      {
        id: "principles-chaos",
        title: "Principles of Chaos Engineering",
        url: "https://principlesofchaos.org/",
        type: "Public principles",
        topics: ["fault-testing", "reliability", "experiments"],
        level: "Applied",
        description: "A concise framework for hypothesis-driven resilience experiments with bounded blast radius.",
        source: "Chaos Engineering community"
      },
      {
        id: "toxiproxy",
        title: "Toxiproxy",
        url: "https://github.com/Shopify/toxiproxy",
        type: "Open-source tool",
        topics: ["fault-testing", "network", "dependencies"],
        level: "Applied",
        description: "A programmable proxy for testing network and dependency failure behavior in development and CI.",
        source: "Shopify"
      },
      {
        id: "testcontainers",
        title: "Testcontainers Documentation",
        url: "https://testcontainers.com/",
        type: "Official project documentation",
        topics: ["integration-testing", "containers", "reproducibility"],
        level: "Foundation",
        description: "Guidance and libraries for disposable dependency environments in integration tests.",
        source: "Testcontainers"
      },
      {
        id: "adr-guide",
        title: "Architecture Decision Records",
        url: "https://adr.github.io/",
        type: "Public method",
        topics: ["decisions", "architecture", "documentation"],
        level: "Foundation",
        description: "A resource hub for recording architectural context, decisions, and consequences.",
        source: "ADR community"
      },
      {
        id: "c4-model",
        title: "The C4 Model",
        url: "https://c4model.com/",
        type: "Public method",
        topics: ["architecture", "diagrams", "communication"],
        level: "Foundation",
        description: "A hierarchical approach to communicating software architecture through context, containers, components, and code.",
        source: "C4 Model"
      },
      {
        id: "twelve-factor",
        title: "The Twelve-Factor App",
        url: "https://12factor.net/",
        type: "Public method",
        topics: ["services", "configuration", "deployment"],
        level: "Foundation",
        description: "A compact baseline for deployable service configuration, dependencies, processes, and logs.",
        source: "Twelve-Factor App"
      },
      {
        id: "google-dapper-paper",
        title: "Dapper: Large-Scale Distributed Systems Tracing",
        url: "https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/",
        type: "Research paper",
        topics: ["tracing", "observability", "distributed-systems"],
        level: "Advanced",
        description: "The public research paper behind influential distributed-tracing architecture and sampling ideas.",
        source: "Google Research"
      },
      {
        id: "google-tail-at-scale",
        title: "The Tail at Scale",
        url: "https://research.google/pubs/the-tail-at-scale/",
        type: "Research paper",
        topics: ["tail-latency", "distributed-systems", "performance"],
        level: "Advanced",
        description: "A foundational paper on how latency variability compounds in fan-out services and ways to reduce it.",
        source: "Google Research"
      },
      {
        id: "amazon-dynamo-paper",
        title: "Dynamo: Amazon's Highly Available Key-value Store",
        url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
        type: "Research paper",
        topics: ["replication", "partitioning", "availability"],
        level: "Advanced",
        description: "A public paper on partitioning, replication, vector clocks, hinted handoff, and availability trade-offs.",
        source: "Amazon"
      },
      {
        id: "google-bigtable-paper",
        title: "Bigtable: A Distributed Storage System for Structured Data",
        url: "https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/",
        type: "Research paper",
        topics: ["storage", "partitioning", "data-model"],
        level: "Advanced",
        description: "A foundational public paper on a distributed sorted map, tablets, storage layout, and system operation.",
        source: "Google Research"
      },
      {
        id: "google-spanner-paper",
        title: "Spanner: Google's Globally Distributed Database",
        url: "https://research.google/pubs/spanner-googles-globally-distributed-database-2/",
        type: "Research paper",
        topics: ["transactions", "replication", "time", "regions"],
        level: "Advanced",
        description: "A public paper on globally replicated transactions, external consistency, and time uncertainty.",
        source: "Google Research"
      },
      {
        id: "sqlite-wal",
        title: "SQLite Write-Ahead Logging",
        url: "https://www.sqlite.org/wal.html",
        type: "Official documentation",
        topics: ["wal", "durability", "databases"],
        level: "Applied",
        description: "Primary documentation for SQLite WAL operation, concurrency, checkpointing, and limitations.",
        source: "SQLite"
      },
      {
        id: "redis-pipelining",
        title: "Redis Pipelining",
        url: "https://redis.io/docs/latest/develop/use/pipelining/",
        type: "Official documentation",
        topics: ["pipelining", "latency", "protocols"],
        level: "Applied",
        description: "Official guidance for Redis command pipelining, round-trip reduction, and client-side batching concerns.",
        source: "Redis"
      }
    ],

    drills: [
      {
        id: "design-notification-platform",
        title: "Design a Notification Platform",
        category: "design",
        level: "Applied",
        prompt:
          "Design transactional and bulk notifications across email and push providers with preferences, priority, retries, ambiguity, and backlog recovery.",
        deliverables: ["Contract", "Queue topology", "Provider state machine", "Capacity model", "Failure matrix"],
        passCriteria: [
          "Critical traffic has reserved capacity.",
          "Provider timeout can remain unknown.",
          "Backlog catch-up is quantitatively feasible."
        ],
        topics: ["queues", "external-effects", "capacity"]
      },
      {
        id: "design-ticket-booking",
        title: "Design Ticket Booking",
        category: "design",
        level: "Applied",
        prompt:
          "Design fair allocation of scarce seats under concurrency, duplicate requests, payment timeout, expiration, and release.",
        deliverables: ["Invariant table", "Transaction path", "State machine", "Contention test"],
        passCriteria: [
          "No-oversell is enforced atomically.",
          "Expired holds cannot release another buyer's seat.",
          "Payment ambiguity has a reconciliation path."
        ],
        topics: ["transactions", "concurrency", "external-effects"]
      },
      {
        id: "design-realtime-pubsub",
        title: "Design Realtime PubSub",
        category: "design",
        level: "Advanced",
        prompt:
          "Design a realtime connection fleet with topic fan-out, missed-update recovery, reconnect storms, slow clients, and deploy draining.",
        deliverables: ["Connection architecture", "Ordering scope", "Replay contract", "Overload plan"],
        passCriteria: [
          "Output buffers are bounded.",
          "Missed pushes converge through replay or pull.",
          "Reconnects use jitter and admission control."
        ],
        topics: ["realtime", "pubsub", "overload"]
      },
      {
        id: "design-web-crawler",
        title: "Design a Web Crawler",
        category: "design",
        level: "Applied",
        prompt:
          "Design a crawler frontier with deduplication, host politeness, retries, recrawl freshness, content storage, and adversarial pages.",
        deliverables: ["Data model", "Partition key", "Scheduling policy", "Abuse limits"],
        passCriteria: [
          "One host cannot monopolize workers.",
          "Deduplication error consequences are explicit.",
          "Poison inputs and retry loops are bounded."
        ],
        topics: ["scheduling", "deduplication", "abuse"]
      },
      {
        id: "design-feature-configuration",
        title: "Design Feature Configuration",
        category: "design",
        level: "Advanced",
        prompt:
          "Design versioned configuration delivery with atomic publication, low-latency push, bounded convergence, audit, and rollback.",
        deliverables: ["Ownership model", "Publication protocol", "Reconciliation path", "Rollback plan"],
        passCriteria: [
          "Readers never see partial artifacts.",
          "Missed pushes are repaired within a bound.",
          "Stale publishers are fenced."
        ],
        topics: ["configuration", "consistency", "coordination"]
      },
      {
        id: "design-distributed-cache",
        title: "Design a Distributed Cache",
        category: "design",
        level: "Advanced",
        prompt:
          "Design a cache with partitioning, replication, hot keys, expiration, eviction, persistence options, and live migration.",
        deliverables: ["Key routing", "Memory policy", "Failure behavior", "Migration state machine"],
        passCriteria: [
          "Source-of-truth behavior is explicit.",
          "Logical and resident memory are observed.",
          "Placement and data movement are separate protocols."
        ],
        topics: ["cache", "partitioning", "memory"]
      },
      {
        id: "design-artifact-registry",
        title: "Design an Artifact Registry",
        category: "design",
        level: "Applied",
        prompt:
          "Design storage and rollout for versioned models, indexes, or configuration with checksums, compatibility, provenance, rollback, and garbage collection.",
        deliverables: ["Metadata schema", "Publication protocol", "Compatibility matrix", "GC policy"],
        passCriteria: [
          "Only validated immutable versions are published.",
          "Readers can roll back safely.",
          "Artifact provenance is verified at deployment."
        ],
        topics: ["artifacts", "deployment", "supply-chain"]
      },
      {
        id: "design-multiregion-metadata",
        title: "Design Multi-region Metadata",
        category: "design",
        level: "Staff",
        prompt:
          "Design a metadata service with regional ownership, replication, failover, split-brain prevention, reconciliation, and failback.",
        deliverables: ["RPO and RTO", "Dependency inventory", "Ownership protocol", "Game-day plan"],
        passCriteria: [
          "Recovery-region dependencies are complete.",
          "Old writers are fenced before new writes begin.",
          "Failback reconciles divergent state safely."
        ],
        topics: ["regions", "replication", "coordination"]
      },
      {
        id: "failure-duplicate-kill-matrix",
        title: "Duplicate and Kill Matrix",
        category: "failure",
        level: "Applied",
        prompt:
          "Duplicate a queued operation and kill the worker before commit, after commit, after side effect, and before acknowledgment.",
        deliverables: ["Fault matrix", "Counters", "Durable artifacts", "Reconciliation report"],
        passCriteria: [
          "Committed work is not lost.",
          "Protected local effects are not duplicated.",
          "External ambiguity is represented honestly."
        ],
        topics: ["idempotency", "queues", "recovery"]
      },
      {
        id: "failure-provider-accept-timeout",
        title: "Provider Accepts Then Times Out",
        category: "failure",
        level: "Advanced",
        prompt:
          "Use a fake provider that accepts one protected request and returns no usable response.",
        deliverables: ["Attempt ledger", "State transitions", "Provider calls", "Resolution outcome"],
        passCriteria: [
          "The provider sees one semantic operation.",
          "Unknown work stays pinned.",
          "No unsafe cross-provider retry occurs."
        ],
        topics: ["external-effects", "ambiguity", "idempotency"]
      },
      {
        id: "failure-cache-flush",
        title: "Cache Flush at Peak",
        category: "failure",
        level: "Applied",
        prompt:
          "Flush the cache during representative peak traffic and delay invalidation for selected keys.",
        deliverables: ["Origin load", "Miss concurrency", "Staleness observations", "Recovery curve"],
        passCriteria: [
          "Origin load remains bounded.",
          "Stale behavior matches the product contract.",
          "The cache rebuild converges."
        ],
        topics: ["cache", "stampede", "staleness"]
      },
      {
        id: "failure-stale-lease-holder",
        title: "Resume a Stale Lease Holder",
        category: "failure",
        level: "Advanced",
        prompt:
          "Pause one owner beyond lease expiry, start a replacement, then resume the old process while both can reach the resource.",
        deliverables: ["Epoch traces", "Accepted writes", "Rejected stale writes", "Recovery log"],
        passCriteria: [
          "Only the current epoch mutates state.",
          "The stale owner is rejected at the resource.",
          "Availability behavior is documented if coordination fails."
        ],
        topics: ["leases", "fencing", "coordination"]
      },
      {
        id: "failure-live-shard-move",
        title: "Crash a Live Shard Move",
        category: "failure",
        level: "Staff",
        prompt:
          "Move a shard under mixed traffic and crash the source, destination, router, or coordinator at each phase.",
        deliverables: ["Phase log", "Sequence lag", "Ownership records", "Data comparison"],
        passCriteria: [
          "No acknowledged mutation is lost.",
          "No stale owner accepts post-cutover writes.",
          "Rollback or forward recovery is deterministic."
        ],
        topics: ["migration", "partitioning", "recovery"]
      },
      {
        id: "failure-disk-boundaries",
        title: "Disk Failure at Durability Boundaries",
        category: "failure",
        level: "Advanced",
        prompt:
          "Inject short writes, disk full, a torn tail, middle corruption, slow synchronization, and crash during recovery.",
        deliverables: ["Sequence positions", "Acknowledged set", "Recovered set", "Repair decisions"],
        passCriteria: [
          "Recovery equals the declared durable prefix.",
          "Middle corruption is not silently skipped.",
          "Append failure does not publish the mutation."
        ],
        topics: ["durability", "storage", "fault-testing"]
      },
      {
        id: "failure-partial-io",
        title: "Partial I/O and Slow Client",
        category: "failure",
        level: "Advanced",
        prompt:
          "Fragment frames at every byte boundary, concatenate requests, force partial writes, and stall one client beside control clients.",
        deliverables: ["Parser oracle", "Reply sequence", "Buffer metrics", "Latency distribution"],
        passCriteria: [
          "Frames remain correct and ordered.",
          "Buffers and per-turn work stay bounded.",
          "Control-client latency meets the fairness target."
        ],
        topics: ["protocols", "event-loop", "fairness"]
      },
      {
        id: "failure-empty-restore",
        title: "Restore into an Empty Environment",
        category: "failure",
        level: "Applied",
        prompt:
          "Recover the authoritative store into an empty environment, then rebuild every cache, index, and materialized view.",
        deliverables: ["Backup manifest", "RPO", "RTO", "Rebuild checksums", "Missing dependency list"],
        passCriteria: [
          "The restored acknowledgment boundary is known.",
          "Derived copies rebuild from named sources.",
          "Measured recovery meets the declared objective."
        ],
        topics: ["restore", "recovery", "derived-state"]
      },
      {
        id: "redteam-timeout-semantics",
        title: "Audit Timeout Semantics",
        category: "red-team",
        level: "Applied",
        prompt:
          "Find every timeout and ask whether it proves no work occurred, only that the caller stopped waiting, or that the outcome is unknown.",
        deliverables: ["Timeout inventory", "Outcome classes", "Unsafe retries", "Fix priority"],
        passCriteria: [
          "Post-handoff ambiguity is distinguished from rejection.",
          "Cross-provider retries are reviewed.",
          "Each retry has one owner and budget."
        ],
        topics: ["timeouts", "ambiguity", "retries"]
      },
      {
        id: "redteam-fleet-multiplication",
        title: "Find Fleet Multipliers",
        category: "red-team",
        level: "Applied",
        prompt:
          "Multiply every local pool, cache refresh, retry, fan-out, background loop, and connection limit by planned fleet size and failover conditions.",
        deliverables: ["Multiplier table", "Global budgets", "Saturation risks", "Admission controls"],
        passCriteria: [
          "The first stateful bottleneck is identified.",
          "One failure domain absent is modeled.",
          "Global limits have enforcement points."
        ],
        topics: ["capacity", "overload", "dependencies"]
      },
      {
        id: "redteam-exactly-once",
        title: "Challenge Every Exactly-Once Claim",
        category: "red-team",
        level: "Advanced",
        prompt:
          "For each exactly-once statement, draw the atomic commit, acknowledgment, crash points, replay path, and external side effects.",
        deliverables: ["Boundary diagrams", "Counterexamples", "Revised guarantees", "Tests"],
        passCriteria: [
          "Claims are scoped to concrete operations.",
          "Dual-system gaps are explicit.",
          "Replay safety is tested rather than assumed."
        ],
        topics: ["exactly-once", "transactions", "queues"]
      },
      {
        id: "redteam-stale-authority",
        title: "Find Stale Authority",
        category: "red-team",
        level: "Advanced",
        prompt:
          "Trace every lease, leader, lock, router, and coordinator to the resource that must reject stale authority.",
        deliverables: ["Authority map", "Epoch path", "Unfenced resources", "Partition tests"],
        passCriteria: [
          "Election and revocation are separated.",
          "Every protected write carries authority evidence.",
          "Pause and partition scenarios are covered."
        ],
        topics: ["fencing", "coordination", "correctness"]
      },
      {
        id: "redteam-rebuild-completeness",
        title: "Prove Rebuild Completeness",
        category: "red-team",
        level: "Applied",
        prompt:
          "List every cache, index, replica, materialized view, model, artifact, and configuration copy, then prove its rebuild source and duration.",
        deliverables: ["Derived-state inventory", "Freshness contracts", "Rebuild commands", "Checksums"],
        passCriteria: [
          "Every copy has one authoritative source.",
          "Missing and stale behavior are defined.",
          "Rebuild has been exercised in an empty environment."
        ],
        topics: ["derived-state", "recovery", "data"]
      },
      {
        id: "redteam-rollback-cliff",
        title: "Locate the Rollback Cliff",
        category: "red-team",
        level: "Advanced",
        prompt:
          "Trace a code, schema, configuration, and data migration to the exact action after which the old version can no longer run safely.",
        deliverables: ["Compatibility matrix", "Rollback phases", "Cleanup gate", "Forward-recovery plan"],
        passCriteria: [
          "Readers become compatible before writers change format.",
          "Cleanup waits for verification.",
          "The irreversible boundary requires explicit approval."
        ],
        topics: ["deployment", "schema", "rollback"]
      },
      {
        id: "redteam-green-but-failing",
        title: "Make Green Components Fail the User",
        category: "red-team",
        level: "Applied",
        prompt:
          "Construct a hot shard, tail-latency, stale-copy, or partial-dependency scenario where fleet averages remain healthy but the workflow fails.",
        deliverables: ["User SLI", "Hidden failure", "Signal tree", "Alert revision"],
        passCriteria: [
          "User impact is detected before host alarms.",
          "The diagnostic path reaches the mechanism.",
          "The alert has an owner and action."
        ],
        topics: ["observability", "tail-latency", "slo"]
      },
      {
        id: "redteam-falsify-capacity",
        title: "Falsify the Capacity Claim",
        category: "red-team",
        level: "Staff",
        prompt:
          "Identify the workload dimensions omitted by the benchmark and design experiments most likely to reverse its conclusion.",
        deliverables: ["Evidence envelope", "Missing dimensions", "Adversarial workload", "Revised claim"],
        passCriteria: [
          "Tail latency and saturation are measured.",
          "Data distribution, skew, network, and dependency behavior are varied.",
          "The final claim states what remains untested."
        ],
        topics: ["performance", "evidence", "experiments"]
      }
    ],

    glossary: [
      {
        id: "acknowledgment-point",
        term: "Acknowledgment point",
        definition: "The exact state transition after which a caller is told that an operation succeeded.",
        topics: ["durability", "queues"]
      },
      {
        id: "admission-control",
        term: "Admission control",
        definition: "A policy that accepts, delays, rejects, or degrades new work before finite resources are exhausted.",
        topics: ["overload", "capacity"]
      },
      {
        id: "atomic-boundary",
        term: "Atomic boundary",
        definition: "A set of changes that become visible together or not at all under the declared failure model.",
        topics: ["transactions", "correctness"]
      },
      {
        id: "at-least-once",
        term: "At-least-once delivery",
        definition: "A delivery model in which acknowledged progress is pursued through retry, so duplicates are possible.",
        topics: ["queues", "idempotency"]
      },
      {
        id: "backpressure",
        term: "Backpressure",
        definition: "A mechanism by which downstream capacity limits the rate or volume accepted from upstream producers.",
        topics: ["overload", "queues"]
      },
      {
        id: "canary",
        term: "Canary rollout",
        definition: "A deployment that exposes a bounded cohort to a new version before wider release.",
        topics: ["deployment", "operations"]
      },
      {
        id: "change-data-capture",
        term: "Change-data capture",
        definition: "A stream of committed data changes used to replicate, migrate, or update derived state.",
        topics: ["migration", "data"]
      },
      {
        id: "circuit-breaker",
        term: "Circuit breaker",
        definition: "A control that temporarily blocks calls to an unhealthy dependency and activates declared fallback behavior.",
        topics: ["reliability", "dependencies"]
      },
      {
        id: "compaction",
        term: "Compaction",
        definition: "A process that rewrites accumulated immutable data into a smaller or more efficient representation.",
        topics: ["storage", "lifecycle"]
      },
      {
        id: "consistency",
        term: "Consistency model",
        definition: "The rules governing which writes a read may observe and how concurrent operations appear to relate.",
        topics: ["data", "distributed-systems"]
      },
      {
        id: "derived-state",
        term: "Derived state",
        definition: "A cache, replica, index, view, or artifact that can be reconstructed from an authoritative source.",
        topics: ["data", "recovery"]
      },
      {
        id: "drain",
        term: "Drain",
        definition: "The controlled completion or handoff of accepted work after new admission has stopped.",
        topics: ["shutdown", "deployment"]
      },
      {
        id: "error-budget",
        term: "Error budget",
        definition: "The tolerated amount of unsuccessful service behavior implied by an SLO over its measurement window.",
        topics: ["slo", "reliability"]
      },
      {
        id: "event-loop",
        term: "Event loop",
        definition: "A runtime that processes readiness and control events through bounded, nonblocking work steps.",
        topics: ["runtime", "networking"]
      },
      {
        id: "fan-out",
        term: "Fan-out",
        definition: "The number of downstream operations, recipients, or partitions activated by one upstream operation.",
        topics: ["capacity", "distributed-systems"]
      },
      {
        id: "fencing-token",
        term: "Fencing token",
        definition: "A monotonic ownership epoch checked by a resource to reject mutations from stale actors.",
        topics: ["coordination", "correctness"]
      },
      {
        id: "freshness-bound",
        term: "Freshness bound",
        definition: "The maximum acceptable age or lag of a copy relative to its authoritative source.",
        topics: ["cache", "consistency"]
      },
      {
        id: "graceful-degradation",
        term: "Graceful degradation",
        definition: "A deliberate reduced mode that preserves defined product integrity while some capability is unavailable.",
        topics: ["reliability", "product"]
      },
      {
        id: "idempotency",
        term: "Idempotency",
        definition: "The property that repeating one semantic operation does not create additional protected effects.",
        topics: ["queues", "api"]
      },
      {
        id: "immutable-publication",
        term: "Immutable publication",
        definition: "Building and validating a new version before atomically switching readers to it.",
        topics: ["deployment", "artifacts"]
      },
      {
        id: "invariant",
        term: "Invariant",
        definition: "A condition that must remain true across concurrency, retry, crash, failover, and recovery.",
        topics: ["correctness", "architecture"]
      },
      {
        id: "isolation-level",
        term: "Isolation level",
        definition: "A transaction contract describing which concurrent anomalies can or cannot be observed.",
        topics: ["transactions", "databases"]
      },
      {
        id: "lease",
        term: "Lease",
        definition: "Time-bounded permission to act that requires renewal and does not by itself revoke a delayed holder.",
        topics: ["coordination", "time"]
      },
      {
        id: "linearizability",
        term: "Linearizability",
        definition: "A consistency property in which each operation appears to take effect once between invocation and response.",
        topics: ["consistency", "distributed-systems"]
      },
      {
        id: "oldest-item-age",
        term: "Oldest-item age",
        definition: "The elapsed time of the oldest queued item, often a stronger backlog signal than depth alone.",
        topics: ["queues", "slo"]
      },
      {
        id: "ordering-scope",
        term: "Ordering scope",
        definition: "The key, partition, producer, session, or stream within which order is guaranteed.",
        topics: ["queues", "events"]
      },
      {
        id: "outbox",
        term: "Transactional outbox",
        definition: "An event record committed with business state and later published by a replay-safe relay.",
        topics: ["transactions", "events"]
      },
      {
        id: "partial-io",
        term: "Partial I/O",
        definition: "Normal network or storage behavior in which one operation transfers only part of the intended bytes.",
        topics: ["protocols", "storage"]
      },
      {
        id: "quorum",
        term: "Quorum",
        definition: "A threshold of participants whose responses are required for a replicated operation or decision.",
        topics: ["replication", "consensus"]
      },
      {
        id: "reconciliation",
        term: "Reconciliation",
        definition: "A repair process that compares desired or authoritative state with observed copies and closes divergence.",
        topics: ["consistency", "operations"]
      },
      {
        id: "resident-memory",
        term: "Resident memory",
        definition: "The process memory currently resident in physical memory, which may differ from logical application accounting.",
        topics: ["memory", "runtime"]
      },
      {
        id: "retry-budget",
        term: "Retry budget",
        definition: "A bound on additional attempts so retry traffic cannot grow without limit during failure.",
        topics: ["retries", "overload"]
      },
      {
        id: "rpo",
        term: "Recovery point objective",
        definition: "The maximum acceptable loss of acknowledged progress for a named failure domain and acknowledgment point.",
        topics: ["recovery", "durability"]
      },
      {
        id: "rto",
        term: "Recovery time objective",
        definition: "The target duration for restoring a defined operation after a named failure.",
        topics: ["recovery", "availability"]
      },
      {
        id: "saturation",
        term: "Saturation",
        definition: "The extent to which a finite resource is occupied and unable to absorb more work without delay or rejection.",
        topics: ["capacity", "performance"]
      },
      {
        id: "shard",
        term: "Shard",
        definition: "A partition of data or work assigned to one ownership and routing domain.",
        topics: ["partitioning", "data"]
      },
      {
        id: "sli",
        term: "Service-level indicator",
        definition: "A quantitative measurement of a user-relevant service behavior.",
        topics: ["slo", "observability"]
      },
      {
        id: "slo",
        term: "Service-level objective",
        definition: "A target for an SLI over a defined population and measurement window.",
        topics: ["reliability", "product"]
      },
      {
        id: "source-of-truth",
        term: "Source of truth",
        definition: "The authoritative state used to resolve disagreement and rebuild derived copies.",
        topics: ["data", "correctness"]
      },
      {
        id: "tail-latency",
        term: "Tail latency",
        definition: "Latency at high percentiles that captures the slowest meaningful fraction of operations.",
        topics: ["performance", "slo"]
      },
      {
        id: "tenant-isolation",
        term: "Tenant isolation",
        definition: "Controls that prevent one tenant from accessing another tenant's data or monopolizing shared resources.",
        topics: ["security", "fairness"]
      },
      {
        id: "unknown-outcome",
        term: "Unknown outcome",
        definition: "A durable state used when a caller cannot prove whether an external operation was accepted or rejected.",
        topics: ["external-effects", "correctness"]
      },
      {
        id: "wal",
        term: "Write-ahead log",
        definition: "A durable ordered record written before dependent in-memory or derived state can be considered recoverable.",
        topics: ["storage", "durability"]
      },
      {
        id: "write-amplification",
        term: "Write amplification",
        definition: "The ratio between physical data written across layers and the logical application change.",
        topics: ["storage", "performance"]
      }
    ]
  };

  Object.defineProperty(window, "FIELD_GUIDE_DATA", {
    value: deepFreeze(data),
    writable: false,
    configurable: false,
    enumerable: true
  });
})();
