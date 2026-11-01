import { FitDimensionId } from './iometeCapabilities';

export type StatementLabel = 'Stated' | 'Sourced' | 'Assumed';
export type EvidenceDirection = 'supports' | 'hurts';
export type EvidenceStrength = 'high' | 'medium' | 'low';
export type VerdictBand = 'Strong fit' | 'Possible fit (needs discovery)' | 'Weak fit' | 'Not a fit';

export interface EvidenceItem {
  id: string;
  dimensionId: FitDimensionId;
  workflowName: string;
  mdQuote: string;
  mdSection: string;
  capabilityId: string;
  direction: EvidenceDirection;
  strength: EvidenceStrength;
  confidence: 'high' | 'medium' | 'low';
  label: StatementLabel;
  explanation: string;
}

export interface DisqualifierFlag {
  id: string;
  title: string;
  reason: string;
  mdQuote: string;
  maxAllowedBand: 'Weak fit' | 'Not a fit';
  maxScoreCap: number;
}

export interface UnknownGap {
  id: string;
  dimensionId: FitDimensionId;
  missingTopic: string;
  impactOnConfidence: string;
  discoveryQuestion: string;
  whoToAsk: string;
}

export interface RankedUseCase {
  rank: number;
  title: string;
  workflowQuote: string;
  capabilityId: string;
  businessOutcome: string;
  label: StatementLabel;
}

export interface ObjectionItem {
  id: string;
  objection: string;
  sourceNote: string;
  honestResponse: string;
  capabilityId: string;
  verificationQuestion: string;
}

export interface SampleCompanyAnalysis {
  id: string;
  name: string;
  shortTag: string;
  deploymentBadge: string;
  industry: string;
  headcount: string;
  dataVolume: string;
  incumbentStack: string;
  expectedVerdict: VerdictBand;
  samplePurpose: string;
  rawMarkdown: string;
  executiveSummaryPlain: {
    text: string;
    label: StatementLabel;
    capabilityId?: string;
  }[];
  evidenceItems: EvidenceItem[];
  disqualifiers: DisqualifierFlag[];
  unknowns: UnknownGap[];
  topUseCases: RankedUseCase[];
  objections: ObjectionItem[];
  competitiveContext: {
    incumbent: string;
    footprint: string;
    discoveryQuestions: string[];
    honestPositioning: string;
  }[];
  nextSteps: {
    stepNumber: number;
    category: 'Docs to Read' | 'Discovery Question' | 'Suggested Pilot Scope';
    title: string;
    detail: string;
    docUrl?: string;
  }[];
  repTalkTrack: {
    openingHook: string;
    callAgenda: string[];
    killerQuestions: string[];
    landminesToAvoid: string[];
  };
  buyerMemo: {
    subject: string;
    toLine: string;
    tlDr: string;
    whyEvaluateNow: string;
    cfoCostSection: string;
    cisoSecuritySection: string;
    recommendedPilot: string;
  };
}

export const BLANK_MD_TEMPLATE = `# Company Profile: [Company Name]

## Business
- Industry, core product/service, regulatory environment, and geographic footprint.

## Workflows
1. [Workflow 1 Name]: Describe what data is processed, how often, and who consumes it.
2. [Workflow 2 Name]: Describe batch ETL, streaming, BI dashboards, or ML training pipelines.
3. [Workflow 3 Name]: Describe compliance reporting or customer-facing data products.

## Data sources
- List transactional DBs (Postgres, Oracle), event streams (Kafka), object stores (S3, MinIO), or SaaS feeds.

## Current stack
- Warehouse/Lakehouse incumbents (Snowflake, Databricks, Cloudera/Hadoop, BigQuery, RDS), orchestration (Airflow, dbt), BI (PowerBI, Tableau, Superset).

## Team
- Number of data engineers, analytics engineers, platform/Kubernetes engineers, and BI analysts.

## Constraints
- Data sovereignty, on-premises / air-gapped mandates, cloud VPC rules, PII/GDPR/DORA/HIPAA compliance, or budget caps.

## Pain points
- What is broken, slow, locked-in, or too expensive today?
`;

export const SAMPLE_COMPANIES: SampleCompanyAnalysis[] = [
  {
    id: 'aegis-bank',
    name: 'Aegis Sovereign Bank & Defense Clearing',
    shortTag: 'Regulated Bank · On-Prem / Air-Gapped',
    deploymentBadge: 'on-prem · k8s air-gap · 4.2 PB',
    industry: 'Regulated European Banking & Defense Settlement',
    headcount: '4,800 employees (38 Data & Platform Engineers)',
    dataVolume: '4.2 PB across structured core ledgers + semi-structured SWIFT/ISO20022 XML & Kafka audit logs',
    incumbentStack: 'Legacy Cloudera CDH (HDFS/Hive expiring Q4) + OpenShift K8s + MinIO Object Storage + Tableau',
    expectedVerdict: 'Strong fit',
    samplePurpose: 'Positive benchmark: regulated institution with strict on-premises / air-gapped sovereignty, large mixed data, and Kubernetes readiness.',
    rawMarkdown: `# Company Profile: Aegis Sovereign Bank & Defense Clearing

## Business
Regulated European tier-2 clearing bank and defense supplier settlement institution operating in Frankfurt and Zurich. Subject to strict EU DORA, BaFin, and national defense data-residency mandates.

## Workflows
1. Core Regulatory Liquidity & DORA Reporting: Nightly batch aggregation of 1.8 billion ledger rows and SWIFT ISO20022 XML messages into auditable regulatory snapshots with 7-year time-travel reproducibility.
2. Real-Time Fraud & Sanctions Screening Stream: Kafka ingestion of 45,000 payment events/sec enriched against sanction watchlists and landed into historical analytical tables.
3. Cross-Department Risk & Treasury BI: 180 risk analysts running interactive SQL and Tableau dashboards over masked customer credit portfolios.
4. Credit Risk ML Feature Pipeline: PySpark feature engineering in Jupyter notebooks training Basel IV default probability models.
5. Legacy Hive-to-Open-Lakehouse Migration: Porting 420 HiveQL and Spark batch jobs off expiring Cloudera hardware onto OpenShift + MinIO.
6. GDPR / Right-to-Erasure & PII Masking: Monthly row-level deletions and dynamic IBAN/SSN column redaction across 600+ analytical tables.

## Data sources
- Core Banking Oracle GoldenGate CDC streams (1.2 PB)
- Apache Kafka payment & SWIFT XML telemetry (2.4 PB)
- Trade desk Parquet & CSV drops on MinIO S3-compatible storage (600 TB)

## Current stack
- Legacy Cloudera CDH 6 (HDFS + Hive + YARN) reaching end-of-support with a 2.8x license renewal hike
- Red Hat OpenShift (Kubernetes) managed by an internal 12-person Platform Engineering team
- 5 PB MinIO S3-compatible NVMe object storage cluster in dual Frankfurt/Zurich data centers
- Airflow + dbt Core for SQL transformations; Tableau + Apache Superset for BI

## Team
- 18 Data Engineers (fluent in PySpark, Scala Spark, Hive SQL)
- 8 Analytics Engineers (dbt + SQL)
- 12 Platform / Kubernetes Engineers (OpenShift, Helm, ArgoCD, Keycloak OIDC)

## Constraints
- Hard regulatory prohibition on multi-tenant public cloud SaaS: defense clearing data must run in an air-gapped on-premises enclave with zero outbound internet.
- Mandatory open table format (Apache Iceberg) required by Architecture Review Board to prevent another 10-year vendor lock-in.
- Must integrate with existing Keycloak OIDC / Active Directory and export immutable query audit logs to Splunk SIEM.

## Pain points
- Cloudera license renewal cost jumped 180% while static YARN nodes sit at 22% utilization overnight.
- Hive tables lack ACID row-level deletes and snapshot time-travel, making BaFin historical audit reproduction a 3-week manual restore effort.
- Cannot use cloud-only Snowflake because core clearing data cannot leave the Frankfurt/Zurich on-prem enclaves.`,
    executiveSummaryPlain: [
      {
        text: 'Aegis Sovereign Bank is a textbook Strong Fit (91/100) because its two non-negotiable mandates-air-gapped on-premises deployment on OpenShift and open Apache Iceberg storage on MinIO-align directly with IOMETE’s core architecture.',
        label: 'Stated'
      },
      {
        text: 'Every one of Aegis’s six workflows maps to a documented IOMETE capability, including air-gapped Kubernetes installation, ACID merges/time-travel for BaFin audits, and dynamic PII column masking for risk analysts.',
        label: 'Sourced',
        capabilityId: 'cap-airgapped-onprem'
      },
      {
        text: 'Because Aegis already operates a 12-person OpenShift platform team and 18 Spark-fluent data engineers, technical time-to-value is unusually fast with zero disqualifiers.',
        label: 'Stated'
      },
      {
        text: 'We did not find explicit concurrency SLA targets for the 180 Tableau analysts, which is surfaced as a concrete discovery question before sizing the SQL compute pools.',
        label: 'Assumed',
        capabilityId: 'cap-bi-jdbc-flight'
      }
    ],
    evidenceItems: [
      {
        id: 'ev-aegis-1',
        dimensionId: 'sovereignty',
        workflowName: 'Defense Clearing Air-Gapped Enclave',
        mdQuote: 'defense clearing data must run in an air-gapped on-premises enclave with zero outbound internet.',
        mdSection: 'Constraints',
        capabilityId: 'cap-airgapped-onprem',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Directly matches IOMETE air-gapped on-premises Kubernetes deployment via offline Helm bundles.'
      },
      {
        id: 'ev-aegis-2',
        dimensionId: 'sovereignty',
        workflowName: 'On-Prem MinIO Object Storage Integration',
        mdQuote: '5 PB MinIO S3-compatible NVMe object storage cluster in dual Frankfurt/Zurich data centers',
        mdSection: 'Current stack',
        capabilityId: 'cap-s3-minio-ceph',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'IOMETE natively uses on-prem MinIO S3-compatible storage as its Iceberg lakehouse storage layer.'
      },
      {
        id: 'ev-aegis-3',
        dimensionId: 'scale',
        workflowName: 'Core Regulatory Liquidity & DORA Reporting',
        mdQuote: 'Nightly batch aggregation of 1.8 billion ledger rows and SWIFT ISO20022 XML messages... 4.2 PB total',
        mdSection: 'Workflows / Data sources',
        capabilityId: 'cap-petabyte-scale',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Petabyte-scale mixed structured ledger + semi-structured XML/Kafka data is the sweet spot for Spark + Iceberg.'
      },
      {
        id: 'ev-aegis-4',
        dimensionId: 'scale',
        workflowName: 'Real-Time Fraud & Sanctions Screening Stream',
        mdQuote: 'Kafka ingestion of 45,000 payment events/sec enriched against sanction watchlists',
        mdSection: 'Workflows',
        capabilityId: 'cap-kafka-streaming',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Spark Structured Streaming ingests high-throughput Kafka feeds directly into transactional Iceberg tables.'
      },
      {
        id: 'ev-aegis-5',
        dimensionId: 'openness',
        workflowName: 'Architecture Board Open Format Mandate',
        mdQuote: 'Mandatory open table format (Apache Iceberg) required by Architecture Review Board to prevent another 10-year vendor lock-in.',
        mdSection: 'Constraints',
        capabilityId: 'cap-apache-iceberg',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'IOMETE stores all tables in open Apache Iceberg + Parquet with zero proprietary storage lock-in.'
      },
      {
        id: 'ev-aegis-6',
        dimensionId: 'workloads',
        workflowName: 'Credit Risk ML Feature Pipeline & BI',
        mdQuote: '180 risk analysts running interactive SQL and Tableau... PySpark feature engineering in Jupyter notebooks',
        mdSection: 'Workflows',
        capabilityId: 'cap-managed-spark',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Covers collaborative SQL, Tableau JDBC connectivity, scheduled Spark ETL, and Jupyter PySpark ML pipelines.'
      },
      {
        id: 'ev-aegis-7',
        dimensionId: 'cost',
        workflowName: 'Legacy Hive-to-Open-Lakehouse Migration',
        mdQuote: 'Cloudera license renewal cost jumped 180% while static YARN nodes sit at 22% utilization overnight.',
        mdSection: 'Pain points',
        capabilityId: 'cap-hadoop-migration',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Replaces static YARN/Cloudera licensing with elastic Kubernetes Spark pods on existing OpenShift + MinIO hardware.'
      },
      {
        id: 'ev-aegis-8',
        dimensionId: 'readiness',
        workflowName: 'OpenShift & Spark Engineering Readiness',
        mdQuote: '18 Data Engineers (fluent in PySpark, Scala Spark, Hive SQL)... 12 Platform / Kubernetes Engineers (OpenShift, Helm)',
        mdSection: 'Team',
        capabilityId: 'cap-k8s-native',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Deep existing Kubernetes, Spark, and dbt expertise eliminates infrastructure onboarding friction.'
      },
      {
        id: 'ev-aegis-9',
        dimensionId: 'governance',
        workflowName: 'GDPR Erasure, PII Masking & BaFin Time-Travel',
        mdQuote: 'Monthly row-level deletions and dynamic IBAN/SSN column redaction across 600+ analytical tables... Keycloak OIDC & Splunk SIEM',
        mdSection: 'Workflows / Constraints',
        capabilityId: 'cap-row-col-masking',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Matches dynamic column masking, Iceberg snapshot time-travel, OIDC SSO, and SIEM audit log export.'
      }
    ],
    disqualifiers: [],
    unknowns: [
      {
        id: 'unk-aegis-1',
        dimensionId: 'workloads',
        missingTopic: 'Peak Tableau Concurrent Queries & P95 Latency SLA',
        impactOnConfidence: '-4% confidence (need concurrency profile to size always-warm SQL lakehouse endpoints)',
        discoveryQuestion: 'Of the 180 risk analysts on Tableau, how many query simultaneously at 9:00 AM Monday, and what is their target dashboard load time?',
        whoToAsk: 'Head of Risk Analytics / BI Lead'
      },
      {
        id: 'unk-aegis-2',
        dimensionId: 'governance',
        missingTopic: 'Enterprise Business Glossary / External Catalog Integration',
        impactOnConfidence: '-3% confidence (verify if Collibra/DataHub integration is expected alongside Iceberg REST Catalog)',
        discoveryQuestion: 'Do you require bi-directional lineage sync with an external business glossary like Collibra or OpenMetadata, or is technical Iceberg catalog RBAC sufficient for phase 1?',
        whoToAsk: 'Chief Data Officer / DORA Compliance Lead'
      }
    ],
    topUseCases: [
      {
        rank: 1,
        title: 'Cloudera CDH / Hive Modernization onto OpenShift + MinIO',
        workflowQuote: 'Porting 420 HiveQL and Spark batch jobs off expiring Cloudera hardware onto OpenShift + MinIO.',
        capabilityId: 'cap-hadoop-migration',
        businessOutcome: 'Eliminates the 2.8x Cloudera renewal spike before Q4 EOL while reusing existing OpenShift & MinIO investments.',
        label: 'Sourced'
      },
      {
        rank: 2,
        title: 'Air-Gapped DORA & BaFin Regulatory Time-Travel Snapshots',
        workflowQuote: 'Nightly batch aggregation of 1.8 billion ledger rows... with 7-year time-travel reproducibility.',
        capabilityId: 'cap-iceberg-timetravel',
        businessOutcome: 'Cuts historical audit reproduction from a 3-week tape restore down to a single timestamped Iceberg SQL query.',
        label: 'Sourced'
      },
      {
        rank: 3,
        title: 'Dynamic IBAN/PII Masking & GDPR Row-Level Erasure',
        workflowQuote: 'Monthly row-level deletions and dynamic IBAN/SSN column redaction across 600+ analytical tables.',
        capabilityId: 'cap-row-col-masking',
        businessOutcome: 'Lets 180 analysts query live risk tables safely without maintaining sanitized duplicate copies.',
        label: 'Sourced'
      }
    ],
    objections: [
      {
        id: 'obj-aegis-1',
        objection: 'Third-party roundups claim IOMETE has thinner enterprise governance tooling than legacy suites or Collibra.',
        sourceNote: 'Section 3.2 competitive intelligence (unverified third-party claim)',
        honestResponse: 'Be upfront: IOMETE provides native RBAC/ABAC, dynamic column masking, row filtering, OIDC SSO, and SIEM audit logs. If Aegis also needs non-technical business glossaries, pair IOMETE’s open Iceberg REST catalog with OpenMetadata or Collibra.',
        capabilityId: 'cap-iceberg-rest-catalog',
        verificationQuestion: 'Which specific BaFin/DORA controls must live inside the query engine versus your external enterprise catalog?'
      },
      {
        id: 'obj-aegis-2',
        objection: 'Will interactive Tableau dashboards over 4.2 PB on MinIO match dedicated MPP appliance latency?',
        sourceNote: 'BI concurrency & cold-read concern',
        honestResponse: 'With 180 analysts, size dedicated always-warm Spark SQL endpoints and configure automated Iceberg compaction on high-cardinality filter columns.',
        capabilityId: 'cap-bi-jdbc-flight',
        verificationQuestion: 'Can we benchmark your top 5 heaviest Tableau workbooks against a 10 TB Iceberg partition during a 2-week pilot?'
      }
    ],
    competitiveContext: [
      {
        incumbent: 'Cloudera (CDH / CDP Private Cloud)',
        footprint: 'Current legacy incumbent for 420 Hive/Spark jobs; contract expiring Q4 with 180% price hike.',
        discoveryQuestions: [
          'How many of the 420 Cloudera jobs use standard Spark SQL / HiveQL versus legacy MapReduce or Impala-specific UDFs?',
          'What is your hard cutoff date before the Cloudera support renewal triggers?'
        ],
        honestPositioning: 'Position IOMETE as the Kubernetes-native successor that runs directly on Aegis’s existing OpenShift and MinIO stack without dedicated Cloudera control-plane nodes.'
      },
      {
        incumbent: 'Dremio / Starburst (On-Prem Lakehouse Query Engines)',
        footprint: 'Often evaluated alongside IOMETE in on-prem Iceberg deals.',
        discoveryQuestions: [
          'Do you want a unified engine that handles both heavy PySpark ETL/ML jobs AND interactive SQL, or do you want to manage separate Trino/Dremio + Spark clusters?',
          'How important is native dbt-iomete and serverless Spark job scheduling in one control plane?'
        ],
        honestPositioning: 'Highlight that Aegis has both 420 heavy Spark ETL/ML pipelines and 180 SQL analysts-IOMETE unifies Spark batch, streaming, and SQL under one Kubernetes operator.'
      }
    ],
    nextSteps: [
      {
        stepNumber: 1,
        category: 'Docs to Read',
        title: 'Review Air-Gapped OpenShift & MinIO Deployment Architecture',
        detail: 'Share the offline Helm bundle & OpenShift SecurityContextConstraints guide with Aegis’s 12-person Platform Engineering lead.',
        docUrl: 'https://docs.iomete.com/deployment/on-prem-air-gapped'
      },
      {
        stepNumber: 2,
        category: 'Discovery Question',
        title: 'Qualify Tableau Peak Concurrency & Impala/UDF Dependencies',
        detail: 'Confirm Monday 9 AM concurrent query load from the 180 risk analysts and verify zero legacy C++ Impala UDF blockers in the 420 Hive jobs.'
      },
      {
        stepNumber: 3,
        category: 'Suggested Pilot Scope',
        title: '14-Day Frankfurt Sandbox Pilot (20 Hive Jobs + 1 BaFin Audit Table)',
        detail: 'Deploy IOMETE on a non-prod OpenShift namespace connected to MinIO; migrate 1 BaFin regulatory table to Iceberg and verify snapshot time-travel + IBAN masking.'
      }
    ],
    repTalkTrack: {
      openingHook: '“You already own the hardest parts of a modern sovereign lakehouse-5 PB of MinIO storage, Red Hat OpenShift, and 18 Spark engineers. IOMETE lets you retire Cloudera before Q4 without ever sending a byte of clearing data outside Frankfurt or Zurich.”',
      callAgenda: [
        '00–05m: Confirm the Q4 Cloudera CDH expiration timeline and air-gapped BaFin/DORA constraints.',
        '05–15m: Walk through how IOMETE runs inside OpenShift on top of existing MinIO buckets using native Apache Iceberg.',
        '15–22m: Address the two open questions (Tableau peak concurrency for 180 analysts & external catalog lineage).',
        '22–30m: Agree on a 14-day air-gapped sandbox pilot on 1 regulatory liquidity workflow.'
      ],
      killerQuestions: [
        'When your Architecture Review Board mandated Apache Iceberg, did they specify whether external engines (like Flink or Trino) also need read access to the REST catalog?',
        'What is the exact calendar date your team must freeze Cloudera migration testing before the Q4 renewal penalty hits?',
        'How are you currently handling GDPR row-level erasure across your 600 Hive tables today?'
      ],
      landminesToAvoid: [
        'Do not promise a specific % TCO reduction over Cloudera until Aegis shares their OpenShift vCore allocation.',
        'Do not claim IOMETE replaces Collibra business glossaries-position IOMETE as the technical Iceberg catalog + RBAC enforcement layer.'
      ]
    },
    buyerMemo: {
      subject: 'Internal Architecture Memo: Evaluating IOMETE to Replace Expiring Cloudera CDH on OpenShift + MinIO',
      toLine: 'Chief Information Security Officer (CISO), VP of Infrastructure, & Head of Enterprise Data',
      tlDr: 'IOMETE is a sovereign Apache Spark + Iceberg lakehouse that deploys directly inside our existing Frankfurt/Zurich OpenShift clusters and MinIO storage. It satisfies our air-gap and open-format mandates while retiring legacy Cloudera HDFS/Hive before the Q4 renewal spike.',
      whyEvaluateNow: 'Our Cloudera CDH 6 cluster reaches end-of-support in Q4 with a 180% license increase, and Hive lacks ACID row deletes and snapshot time-travel required for BaFin/DORA audits.',
      cfoCostSection: 'Instead of paying for dedicated static YARN/HDFS servers that sit 78% idle overnight, IOMETE autoscales Spark pods on our existing OpenShift hardware and stores data in standard Parquet/Iceberg on our amortized MinIO cluster.',
      cisoSecuritySection: '100% air-gapped on-premises execution with zero outbound telemetry. Integrates with corporate Keycloak OIDC/Active Directory, enforces dynamic IBAN/PII column masking, and streams immutable query audit logs to Splunk SIEM.',
      recommendedPilot: 'Run a 2-week isolated PoC in our Frankfurt dev OpenShift cluster migrating 1 DORA liquidity reporting pipeline and benchmarking 5 Tableau risk dashboards.'
    }
  },
  {
    id: 'pulsenote-startup',
    name: 'PulseNote SaaS (Negative Control)',
    shortTag: 'Seed Startup · Single Managed Postgres',
    deploymentBadge: 'managed rds · 42 GB · 0 data eng',
    industry: 'B2B Team Meeting Notes & Action-Item SaaS',
    headcount: '14 employees (4 Full-Stack TypeScript Engineers, 0 Data Engineers)',
    dataVolume: '42 GB total in a single AWS RDS PostgreSQL instance (growing ~1.5 GB/month)',
    incumbentStack: 'AWS RDS Postgres + Prisma ORM + Metabase Cloud + Stripe Webhooks',
    expectedVerdict: 'Not a fit',
    samplePurpose: 'Negative control (PRD Section 0.2 & 9): proves the scoring engine says NO when a company has tiny data, no data team, and requires zero-ops managed SaaS.',
    rawMarkdown: `# Company Profile: PulseNote SaaS

## Business
Seed-stage B2B SaaS startup building collaborative meeting notes for remote product teams. 14 employees total, US-only customer base, hosted on standard AWS us-east-1.

## Workflows
1. Daily Founder KPI Dashboard: 8 SQL queries in Metabase Cloud counting daily active workspaces, trial conversions, and Stripe MRR.
2. Application CRUD & Search: Sub-15ms transactional reads and writes for user notes and workspace permissions via Prisma ORM.
3. Weekly CSV Billing Export: A 200-line Node.js cron job exporting 12,000 invoice rows to Stripe and QuickBooks once a week.

## Data sources
- Single AWS RDS PostgreSQL 16 database (42 GB total size across 28 tables)
- Stripe billing webhooks (~4,000 events/day)

## Current stack
- AWS RDS Postgres (db.t4g.large, $140/month)
- Vercel + Next.js + Prisma ORM
- Metabase Cloud ($85/month) connected directly to a Postgres read replica

## Team
- 4 Full-Stack TypeScript / React Engineers
- 0 Data Engineers, 0 Platform/Kubernetes Engineers, 0 DevOps staff

## Constraints
- Hard requirement for 100% vendor-hosted, zero-maintenance SaaS tools: the team refuses to run Kubernetes, Helm charts, or manage VPC infrastructure.
- Total monthly analytics budget is capped at $300/month.
- Standard public cloud SaaS is completely acceptable; no on-premises, hybrid, or sovereign data residency rules.

## Pain points
- One unindexed SQL join in Metabase took 4 seconds last Tuesday before an engineer added a Postgres B-tree index.
- Founder wondered if they need a "modern AI data lakehouse" after reading a conference blog post.`,
    executiveSummaryPlain: [
      {
        text: 'PulseNote SaaS is Not a Fit (16/100 - Capped by 3 Hard Disqualifiers). Recommending an enterprise Kubernetes data lakehouse to a 14-person startup with 42 GB of Postgres data would be irresponsible.',
        label: 'Stated'
      },
      {
        text: 'IOMETE is architected for enterprise data teams operating Apache Spark and Iceberg on Kubernetes across large datasets or sovereign environments-none of which apply to PulseNote.',
        label: 'Sourced',
        capabilityId: 'cap-k8s-native'
      },
      {
        text: 'Three explicit disqualifiers trigger here: (1) total data volume is 42 GB with zero unstructured/big-data scale, (2) the company has zero data or Kubernetes engineers, and (3) leadership has a hard requirement for zero-ops vendor-hosted SaaS under $300/month.',
        label: 'Stated'
      },
      {
        text: 'Honest advice to the buyer: keep your existing AWS RDS Postgres read replica + Metabase setup, or use DuckDB / MotherDuck if analytical queries grow past 100 GB.',
        label: 'Assumed',
        capabilityId: 'cap-petabyte-scale'
      }
    ],
    evidenceItems: [
      {
        id: 'ev-pulse-1',
        dimensionId: 'sovereignty',
        workflowName: 'Standard Public Cloud SaaS Posture',
        mdQuote: 'Standard public cloud SaaS is completely acceptable; no on-premises, hybrid, or sovereign data residency rules.',
        mdSection: 'Constraints',
        capabilityId: 'cap-sovereign-byoc',
        direction: 'hurts',
        strength: 'high',
        confidence: 'high',
        label: 'Stated',
        explanation: 'Zero need for sovereign, on-premises, or customer-hosted data plane isolation.'
      },
      {
        id: 'ev-pulse-2',
        dimensionId: 'scale',
        workflowName: 'Single 42 GB Postgres Database',
        mdQuote: 'Single AWS RDS PostgreSQL 16 database (42 GB total size across 28 tables)... growing ~1.5 GB/month',
        mdSection: 'Data sources',
        capabilityId: 'cap-petabyte-scale',
        direction: 'hurts',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'IOMETE docs specify lakehouse value at large scale; 42 GB fits entirely in RAM on a single Postgres instance.'
      },
      {
        id: 'ev-pulse-3',
        dimensionId: 'openness',
        workflowName: 'Standard Postgres Relational Schema',
        mdQuote: 'AWS RDS Postgres (db.t4g.large, $140/month) + Prisma ORM',
        mdSection: 'Current stack',
        capabilityId: 'cap-apache-iceberg',
        direction: 'hurts',
        strength: 'medium',
        confidence: 'high',
        label: 'Stated',
        explanation: 'Already on open-source PostgreSQL with zero proprietary data warehouse lock-in.'
      },
      {
        id: 'ev-pulse-4',
        dimensionId: 'workloads',
        workflowName: 'Application CRUD & 8 Metabase Queries',
        mdQuote: 'Sub-15ms transactional reads and writes... 8 SQL queries in Metabase Cloud counting daily active workspaces',
        mdSection: 'Workflows',
        capabilityId: 'cap-apache-iceberg',
        direction: 'hurts',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'OLTP CRUD requires Postgres, and 8 daily KPI queries do not justify distributed Spark clusters.'
      },
      {
        id: 'ev-pulse-5',
        dimensionId: 'cost',
        workflowName: '$300/month Total Analytics Budget',
        mdQuote: 'AWS RDS Postgres ($140/month)... Total monthly analytics budget is capped at $300/month.',
        mdSection: 'Current stack / Constraints',
        capabilityId: 'cap-cost-no-markup',
        direction: 'hurts',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Just the baseline Kubernetes control-plane and worker nodes would exceed their entire $300/mo budget.'
      },
      {
        id: 'ev-pulse-6',
        dimensionId: 'readiness',
        workflowName: 'Zero Data or Kubernetes Team',
        mdQuote: '0 Data Engineers, 0 Platform/Kubernetes Engineers... refuses to run Kubernetes, Helm charts, or manage VPC infrastructure.',
        mdSection: 'Team / Constraints',
        capabilityId: 'cap-k8s-native',
        direction: 'hurts',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'IOMETE deploys on Kubernetes; PulseNote runs serverless Vercel + RDS with zero K8s capability.'
      }
    ],
    disqualifiers: [
      {
        id: 'disq-pulse-1',
        title: 'Tiny Data Volume (<100 GB) & No Data Team',
        reason: 'Total dataset is 42 GB in a single Postgres instance with 0 data engineers. Distributed Spark + Iceberg adds operational overhead with zero performance benefit.',
        mdQuote: 'Single AWS RDS PostgreSQL 16 database (42 GB total size across 28 tables)... 0 Data Engineers',
        maxAllowedBand: 'Not a fit',
        maxScoreCap: 20
      },
      {
        id: 'disq-pulse-2',
        title: 'Hard Requirement for Zero-Ops Vendor-Hosted SaaS Only',
        reason: 'Prospect explicitly refuses to operate Kubernetes clusters or customer-hosted VPC data planes.',
        mdQuote: 'Hard requirement for 100% vendor-hosted, zero-maintenance SaaS tools: the team refuses to run Kubernetes',
        maxAllowedBand: 'Not a fit',
        maxScoreCap: 20
      },
      {
        id: 'disq-pulse-3',
        title: 'Primary Workload is Sub-15ms OLTP Application CRUD',
        reason: 'A data lakehouse is an analytical (OLAP/ETL) system, not a replacement for transactional Prisma/Postgres CRUD.',
        mdQuote: 'Sub-15ms transactional reads and writes for user notes and workspace permissions via Prisma ORM.',
        maxAllowedBand: 'Not a fit',
        maxScoreCap: 20
      }
    ],
    unknowns: [
      {
        id: 'unk-pulse-1',
        dimensionId: 'governance',
        missingTopic: 'Enterprise Compliance or Audit Requirements',
        impactOnConfidence: 'Dimension excluded from average (no mention of SOC2/HIPAA/RBAC governance needs in input)',
        discoveryQuestion: 'Are enterprise customers asking for dedicated single-tenant data isolation or SOC2 audit logs in the next 12 months?',
        whoToAsk: 'CTO / Co-Founder'
      }
    ],
    topUseCases: [
      {
        rank: 1,
        title: 'None - Stay on PostgreSQL Read Replica + Metabase',
        workflowQuote: '8 SQL queries in Metabase Cloud counting daily active workspaces, trial conversions, and Stripe MRR.',
        capabilityId: 'cap-petabyte-scale',
        businessOutcome: 'Saves engineering distraction. A Postgres read replica handles 42 GB effortlessly at $140/month.',
        label: 'Sourced'
      }
    ],
    objections: [
      {
        id: 'obj-pulse-1',
        objection: 'Why shouldn’t we set up a lakehouse now so we are "future-proofed" for scale?',
        sourceNote: 'Premature optimization risk',
        honestResponse: 'At 1.5 GB/month growth, it will take 5+ years to outgrow a single Postgres node. Adopting Kubernetes + Spark today would burn full-stack engineering sprints with negative ROI.',
        capabilityId: 'cap-k8s-native',
        verificationQuestion: 'Is there any upcoming product feature (like ingesting terabytes of raw video/audio) not mentioned in your brief?'
      }
    ],
    competitiveContext: [
      {
        incumbent: 'AWS RDS PostgreSQL + Read Replica',
        footprint: 'Current 42 GB transactional and analytical store ($140/month).',
        discoveryQuestions: [
          'Have you enabled `pg_stat_statements` to spot slow queries before considering a separate analytical database?'
        ],
        honestPositioning: 'PostgreSQL is the right tool here. Disqualify politely and invite them back when analytical data exceeds 5–10 TB or enterprise customers mandate sovereign BYOC.'
      }
    ],
    nextSteps: [
      {
        stepNumber: 1,
        category: 'Discovery Question',
        title: 'Confirm No Unstated High-Volume Audio/Video Telemetry',
        detail: 'Ask one 30-second check question: “Are you storing raw meeting audio/video embeddings at multi-terabyte scale, or only text notes?”'
      },
      {
        stepNumber: 2,
        category: 'Suggested Pilot Scope',
        title: 'Politely Disqualify - Do Not Run a Pilot',
        detail: 'Close the opportunity as Not a Fit (Disqualified on Scale & SaaS-only constraint) and save rep + founder time.'
      },
      {
        stepNumber: 3,
        category: 'Docs to Read',
        title: 'When You Do Need a Lakehouse (Architecture Guide)',
        detail: 'Leave a helpful bookmark on when Spark + Iceberg actually becomes relevant (>10 TB, multi-engine, or sovereign deployment).',
        docUrl: 'https://docs.iomete.com/architecture/storage-layer'
      }
    ],
    repTalkTrack: {
      openingHook: '“I read your stack brief carefully, and I’m going to save you time and money today: at 42 GB on RDS Postgres with a 4-person TypeScript team, you do not need IOMETE-or any data lakehouse-right now.”',
      callAgenda: [
        '00–03m: Explain clearly why 42 GB belongs in Postgres, not distributed Spark on Kubernetes.',
        '03–07m: Verify they aren’t secretly planning to store 50 TB of raw meeting video/audio.',
        '07–10m: Part as a trusted advisor so they call IOMETE first if they ever hit enterprise BYOC or multi-terabyte scale.'
      ],
      killerQuestions: [
        'Other than text notes and Stripe webhooks, is there any multi-terabyte telemetry stream on your 12-month roadmap?'
      ],
      landminesToAvoid: [
        'Never try to force-fit a Kubernetes lakehouse onto a 14-person team with zero DevOps staff-it will churn in 30 days.'
      ]
    },
    buyerMemo: {
      subject: 'Internal Recommendation: Do NOT Adopt a Data Lakehouse Yet (Stay on RDS Postgres)',
      toLine: 'Founders & Engineering Team, PulseNote',
      tlDr: 'We evaluated IOMETE (and the broader Spark/Iceberg lakehouse category) against our 42 GB dataset and 4-person engineering team. Verdict: Not a Fit today. We should remain on AWS RDS Postgres + Metabase.',
      whyEvaluateNow: 'We wanted to check if our 4-second Metabase query required a dedicated analytical data platform.',
      cfoCostSection: 'Our current RDS + Metabase stack costs $225/month. Running a dedicated Kubernetes lakehouse cluster would increase infrastructure spend 5x–10x while requiring DevOps maintenance we do not have.',
      cisoSecuritySection: 'Our data is already isolated in our AWS RDS VPC. No regulatory or on-premises sovereignty mandate requires a self-hosted lakehouse.',
      recommendedPilot: 'No pilot recommended. Re-evaluate only when analytical data exceeds 5 TB or enterprise deals require sovereign on-prem deployment.'
    }
  },
  {
    id: 'verve-retail',
    name: 'Verve Omnichannel Media & Retail',
    shortTag: 'Mid-Market Retail · Cloud Warehouse Mixed Signals',
    deploymentBadge: 'aws eks + snowflake · 180 TB · mixed signals',
    industry: 'Mid-Size Omnichannel Retail & Digital Commerce Media',
    headcount: '950 employees (9 Data & Analytics Engineers)',
    dataVolume: '180 TB across Snowflake tables + raw S3 clickstream JSON logs',
    incumbentStack: 'Snowflake Enterprise ($420k/yr) + Fivetran (45 SaaS connectors) + dbt Core + PowerBI + AWS S3',
    expectedVerdict: 'Possible fit (needs discovery)',
    samplePurpose: 'Middle benchmark (PRD Section 9): cloud warehouse incumbent with strong cost/openness pain, mixed signals on connectors, and critical unknowns that produce high-value discovery questions.',
    rawMarkdown: `# Company Profile: Verve Omnichannel Media & Retail

## Business
Mid-size European & North American omnichannel fashion retailer and retail-media network (950 employees). Operates 120 physical stores, an e-commerce platform, and sponsored ad placements for brands.

## Workflows
1. High-Volume Clickstream & Ad-Impression Processing: 140 TB of raw JSON clickstream and ad-impression logs landing in AWS S3 every year; currently only 30% is loaded into Snowflake because ingestion and compute credits are too expensive.
2. Omnichannel Inventory & POS Reconciliation: Hourly dbt SQL transformations joining store POS feeds with warehouse inventory for 85 PowerBI store managers.
3. Retail Media Audience Segmentation (PySpark / ML): Data science team wants to run Python/PySpark propensity models over full 3-year clickstream history in S3 without paying Snowflake XL warehouse rates.
4. 45 SaaS Marketing & CRM Connectors: Daily ingestion from Salesforce, Shopify, Klaviyo, Google Ads, and Meta Ads via Fivetran.

## Data sources
- AWS S3 clickstream & ad-server JSON/Parquet logs (140 TB)
- Store POS Postgres & ERP feeds (25 TB)
- 45 SaaS marketing/CRM APIs synced via Fivetran (15 TB)

## Current stack
- Snowflake Enterprise on AWS ($420,000/year annual contract, up from $240k two years ago)
- Fivetran for SaaS ingestion
- dbt Core for SQL transformations
- Microsoft PowerBI for business reporting
- Company runs AWS EKS (Kubernetes) for its e-commerce microservices, though the Data Team has never shared clusters with DevOps.

## Team
- 4 Data Engineers (Python, SQL, basic Spark)
- 3 Analytics Engineers (dbt Core, PowerBI)
- 2 Data Scientists (Python, Jupyter)

## Constraints
- VP of Engineering wants to adopt Apache Iceberg on AWS S3 so both Spark ML and SQL BI read the same open tables without vendor lock-in.
- Must cut annual data warehouse compute growth by at least 30% before the Snowflake renewal in 5 months.
- Unknown whether EU customer loyalty PII has strict sovereign VPC residency requirements or if standard cloud is fine.
- Unknown whether the internal AWS EKS DevOps team will support a Kubernetes-hosted data plane for the data team.

## Pain points
- Snowflake compute bill hit $420k/yr; the team is afraid to query raw 140 TB clickstream logs because each full scan burns hundreds of dollars in credits.
- Data scientists currently export CSVs from Snowflake to S3 to run Python models, creating ungoverned shadow copies.`,
    executiveSummaryPlain: [
      {
        text: 'Verve Omnichannel Retail is a Possible Fit - Needs Discovery (64/100, Medium Confidence 71%). There is a strong case for moving their 140 TB S3 clickstream and PySpark ML workloads onto IOMETE, but two critical operational unknowns must be resolved first.',
        label: 'Stated'
      },
      {
        text: 'Verve’s core pain-$420k/yr in Snowflake credit burn and inability to run PySpark ML over 140 TB of S3 logs-maps directly to IOMETE’s open Apache Iceberg on AWS S3, dbt adapter, and auto-scaling Spark clusters.',
        label: 'Sourced',
        capabilityId: 'cap-apache-iceberg'
      },
      {
        text: 'However, Verve relies on 45 Fivetran SaaS connectors (which IOMETE does not replace natively), and we do not know if Verve’s AWS EKS DevOps team will support a Kubernetes data plane or if strict EU data sovereignty applies.',
        label: 'Stated'
      },
      {
        text: 'Rather than proposing a risky “rip-and-replace” of all 45 Snowflake/Fivetran marts on day one, the winning play is a hybrid lakehouse offload for the 140 TB S3 clickstream + PySpark ML workload first.',
        label: 'Assumed',
        capabilityId: 'cap-cost-no-markup'
      }
    ],
    evidenceItems: [
      {
        id: 'ev-verve-1',
        dimensionId: 'scale',
        workflowName: '140 TB Raw S3 Clickstream & Ad-Impression Logs',
        mdQuote: '140 TB of raw JSON clickstream and ad-impression logs landing in AWS S3... 180 TB total',
        mdSection: 'Workflows / Data sources',
        capabilityId: 'cap-petabyte-scale',
        direction: 'supports',
        strength: 'high',
        confidence: 'high',
        label: 'Sourced',
        explanation: '140 TB of semi-structured S3 logs that are currently too expensive to load into Snowflake is an ideal lakehouse workload.'
      },
      {
        id: 'ev-verve-2',
        dimensionId: 'openness',
        workflowName: 'VP Eng Mandate for Apache Iceberg on S3',
        mdQuote: 'VP of Engineering wants to adopt Apache Iceberg on AWS S3 so both Spark ML and SQL BI read the same open tables without vendor lock-in.',
        mdSection: 'Constraints',
        capabilityId: 'cap-zero-lockin-parquet',
        direction: 'supports',
        strength: 'medium',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'Directly aligns with IOMETE open Iceberg tables stored in Verve’s own AWS S3 buckets.'
      },
      {
        id: 'ev-verve-3',
        dimensionId: 'cost',
        workflowName: '$420k/yr Snowflake Compute Credit Pressure',
        mdQuote: 'Snowflake compute bill hit $420k/yr; the team is afraid to query raw 140 TB clickstream logs... Must cut annual data warehouse compute growth',
        mdSection: 'Pain points / Constraints',
        capabilityId: 'cap-cost-no-markup',
        direction: 'supports',
        strength: 'medium',
        confidence: 'medium',
        label: 'Sourced',
        explanation: 'Running Spark on Verve’s own AWS EC2 spot/reserved nodes in EKS eliminates per-query credit markup on heavy clickstream scans.'
      },
      {
        id: 'ev-verve-4',
        dimensionId: 'workloads',
        workflowName: 'PySpark Retail Media ML + dbt + PowerBI',
        mdQuote: 'Hourly dbt SQL transformations... 85 PowerBI store managers... Python/PySpark propensity models over full 3-year clickstream history',
        mdSection: 'Workflows',
        capabilityId: 'cap-dbt-adapter',
        direction: 'supports',
        strength: 'medium',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'IOMETE supports dbt Core transformations, PowerBI JDBC, and Jupyter PySpark over the same Iceberg tables.'
      },
      {
        id: 'ev-verve-5',
        dimensionId: 'workloads',
        workflowName: '45 SaaS Marketing & CRM Connectors (Fivetran Dependency)',
        mdQuote: '45 SaaS Marketing & CRM Connectors: Daily ingestion from Salesforce, Shopify, Klaviyo, Google Ads, and Meta Ads via Fivetran.',
        mdSection: 'Workflows',
        capabilityId: 'cap-kafka-streaming',
        direction: 'hurts',
        strength: 'medium',
        confidence: 'high',
        label: 'Sourced',
        explanation: 'IOMETE is not a SaaS connector tool; Verve must keep Fivetran/Airbyte pointed at S3/Iceberg destination.'
      },
      {
        id: 'ev-verve-6',
        dimensionId: 'readiness',
        workflowName: 'Data Team Has Never Shared AWS EKS with DevOps',
        mdQuote: 'Company runs AWS EKS (Kubernetes) for its e-commerce microservices, though the Data Team has never shared clusters with DevOps.',
        mdSection: 'Current stack',
        capabilityId: 'cap-k8s-native',
        direction: 'hurts',
        strength: 'high',
        confidence: 'high',
        label: 'Stated',
        explanation: 'EKS skills exist in the company, but cross-team DevOps ownership for an EKS data plane is unconfirmed.'
      }
    ],
    disqualifiers: [],
    unknowns: [
      {
        id: 'unk-verve-1',
        dimensionId: 'sovereignty',
        missingTopic: 'EU Customer Loyalty PII Residency & VPC Sovereignty Rules',
        impactOnConfidence: 'Dimension excluded from average (-14% confidence): input explicitly states sovereignty requirements are unknown',
        discoveryQuestion: 'Does European retail loyalty data require strict VPC residency inside an EU AWS account, or is sovereignty a nice-to-have secondary to Snowflake cost reduction?',
        whoToAsk: 'VP of Engineering & Legal/Privacy Officer'
      },
      {
        id: 'unk-verve-2',
        dimensionId: 'governance',
        missingTopic: 'Row/Column Access Control Requirements for Shadow CSV Exports',
        impactOnConfidence: 'Dimension excluded from average (-10% confidence): no explicit RBAC/masking specification in input',
        discoveryQuestion: 'When data scientists currently export CSVs to S3, what PII columns need dynamic masking or RBAC enforcement in the unified Iceberg catalog?',
        whoToAsk: 'Lead Data Engineer / Security Architect'
      },
      {
        id: 'unk-verve-3',
        dimensionId: 'readiness',
        missingTopic: 'DevOps Willingness to Provision Dedicated EKS Node Group for IOMETE',
        impactOnConfidence: '-5% confidence: determines whether onboarding takes 3 days or stalls in internal IT politics',
        discoveryQuestion: 'Will your e-commerce Platform team allocate a dedicated AWS EKS cluster/namespace via Terraform for IOMETE, or does the 4-person data team need guided BYOC onboarding?',
        whoToAsk: 'VP of Engineering / Head of Platform'
      }
    ],
    topUseCases: [
      {
        rank: 1,
        title: '140 TB S3 Clickstream & Ad-Impression Lakehouse Offload',
        workflowQuote: '140 TB of raw JSON clickstream and ad-impression logs landing in AWS S3... currently only 30% is loaded into Snowflake because compute credits are too expensive.',
        capabilityId: 'cap-apache-iceberg',
        businessOutcome: 'Unlocks 100% of the 140 TB clickstream history in open Iceberg on S3 without burning Snowflake ingestion/compute credits.',
        label: 'Sourced'
      },
      {
        rank: 2,
        title: 'Direct PySpark Propensity Modeling Without Shadow CSV Exports',
        workflowQuote: 'Data scientists currently export CSVs from Snowflake to S3 to run Python models, creating ungoverned shadow copies.',
        capabilityId: 'cap-jupyter-ml',
        businessOutcome: 'Lets the 2 data scientists run PySpark in Jupyter directly against governed Iceberg tables on S3.',
        label: 'Sourced'
      },
      {
        rank: 3,
        title: 'Porting High-Frequency dbt Transformations via dbt-iomete',
        workflowQuote: 'Hourly dbt SQL transformations joining store POS feeds with warehouse inventory for 85 PowerBI store managers.',
        capabilityId: 'cap-dbt-adapter',
        businessOutcome: 'Moves heavy hourly dbt joins off XL Snowflake warehouses before the 5-month contract renewal.',
        label: 'Sourced'
      }
    ],
    objections: [
      {
        id: 'obj-verve-1',
        objection: 'We depend on 45 Fivetran SaaS connectors (Shopify, Klaviyo, Meta Ads) and IOMETE has fewer pre-built SaaS connectors.',
        sourceNote: 'PRD Section 3.2 third-party connector claim',
        honestResponse: 'Acknowledge this directly: IOMETE does not replace Fivetran. Keep Fivetran for your 45 SaaS sources-simply point Fivetran’s destination to S3/Iceberg (or keep small SaaS tables in Snowflake while offloading the 140 TB clickstream + heavy dbt jobs to IOMETE).',
        capabilityId: 'cap-kafka-streaming',
        verificationQuestion: 'Which percentage of your $420k Snowflake spend comes from the 45 small SaaS tables versus the 140 TB clickstream and hourly POS dbt merges?'
      },
      {
        id: 'obj-verve-2',
        objection: 'Why not just use Snowflake’s new Iceberg tables instead of adding IOMETE?',
        sourceNote: 'Incumbent counter-pitch',
        honestResponse: 'Snowflake Iceberg tables solve storage openness, but you still pay Snowflake per-credit compute rates for every query and still cannot run native PySpark on your own AWS spot instances.',
        capabilityId: 'cap-cost-no-markup',
        verificationQuestion: 'If you keep paying Snowflake compute credits on 140 TB of clickstream scans, will that hit your VP’s 30% compute reduction target?'
      }
    ],
    competitiveContext: [
      {
        incumbent: 'Snowflake Enterprise ($420k/yr on AWS)',
        footprint: 'Primary incumbent with renewal in 5 months; pain is compute credit inflation on 140 TB clickstream & lack of native PySpark.',
        discoveryQuestions: [
          'If you pull the top 10 most expensive queries from `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY`, how much of the $420k/yr is spent on clickstream + hourly dbt merges?',
          'Are you locked into a multi-year Snowflake capacity commit, or can you right-size your commit at the 5-month renewal?'
        ],
        honestPositioning: 'Do not pitch a risky 100% rip-and-replace on call #1. Pitch an AWS S3 Iceberg Lakehouse offload for the 140 TB clickstream + PySpark ML workload so Verve can downsize their Snowflake renewal tier.'
      },
      {
        incumbent: 'Databricks on AWS',
        footprint: 'Likely alternative evaluated for PySpark + Lakehouse.',
        discoveryQuestions: [
          'Have you priced out Databricks DBU markups on top of AWS EC2 for 140 TB of continuous clickstream compaction and hourly dbt runs?'
        ],
        honestPositioning: 'Contrast IOMETE’s predictable Kubernetes BYOC model and native Apache Iceberg focus against DBU credit consumption.'
      }
    ],
    nextSteps: [
      {
        stepNumber: 1,
        category: 'Discovery Question',
        title: 'Resolve the 3 Unknowns (EKS Ownership, EU PII Sovereignty, Top 10 Query Spend)',
        detail: 'Ask the VP of Engineering if the Platform team can provision an EKS namespace and inspect `QUERY_HISTORY` to quantify clickstream credit burn.'
      },
      {
        stepNumber: 2,
        category: 'Docs to Read',
        title: 'Review AWS BYOC Deployment & dbt-iomete Adapter Docs',
        detail: 'Send the AWS EKS Terraform guide and `dbt-iomete` configuration reference to Verve’s Lead Data Engineer.',
        docUrl: 'https://docs.iomete.com/integrations/dbt'
      },
      {
        stepNumber: 3,
        category: 'Suggested Pilot Scope',
        title: 'Scoped 2-Week Clickstream & PySpark Offload Pilot',
        detail: 'Keep Fivetran untouched. Point IOMETE at 1 month of raw S3 clickstream logs (12 TB), convert to Iceberg, run 1 dbt model + 1 PySpark propensity notebook, and compare AWS EC2 cost vs. Snowflake credits.'
      }
    ],
    repTalkTrack: {
      openingHook: '“You have 140 TB of high-value clickstream data sitting dark in AWS S3 because querying it in Snowflake burns through your $420k credit budget. Instead of ripping out all 45 Fivetran connectors before your 5-month renewal, let’s put IOMETE on top of that S3 bucket so your data scientists and dbt models can query all 140 TB in open Iceberg at raw AWS EC2 cost.”',
      callAgenda: [
        '00–06m: Validate the 5-month Snowflake renewal timeline and the 140 TB S3 clickstream bottleneck.',
        '06–15m: Show how IOMETE runs in their AWS VPC on EKS over open Iceberg tables (solving shadow CSV exports).',
        '15–23m: Ask the 3 discovery questions (EKS DevOps support, EU loyalty PII rules, Fivetran destination setup).',
        '23–30m: Scope a low-risk Phase-1 Clickstream Offload Pilot so they have hard numbers before renegotiating Snowflake.'
      ],
      killerQuestions: [
        'If we look at `ACCOUNT_USAGE.QUERY_HISTORY`, what percentage of your $420k Snowflake spend comes from the 30% of clickstream logs you currently ingest?',
        'Would your AWS EKS platform team prefer to hand us a dedicated Kubernetes namespace, or should we deploy in a separate isolated AWS VPC?',
        'Are there EU GDPR/residency rules on customer loyalty data that require keeping raw clickstream events inside an eu-central-1 bucket?'
      ],
      landminesToAvoid: [
        'Do not claim IOMETE replaces their 45 Fivetran SaaS connectors-tell them to keep Fivetran and land the data in S3/Iceberg.',
        'Do not pitch a 100% Snowflake replacement in 5 months before confirming EKS support from their platform team.'
      ]
    },
    buyerMemo: {
      subject: 'Internal Proposal: Offloading 140 TB S3 Clickstream & PySpark ML to IOMETE (Apache Iceberg on AWS EKS)',
      toLine: 'VP of Engineering, CFO, & Head of Analytics - Verve Omnichannel',
      tlDr: 'With our Snowflake renewal 5 months away at $420k/yr, we are currently leaving 70% of our 140 TB S3 clickstream dark due to credit costs, while data scientists export ungoverned CSVs. IOMETE lets us query and train PySpark models directly on S3 in open Apache Iceberg inside our own AWS EKS environment.',
      whyEvaluateNow: 'We have a 5-month window before our Snowflake contract renewal to prove we can run heavy clickstream ETL, dbt transformations, and PySpark ML on open Iceberg tables-giving us both architectural portability and renewal leverage.',
      cfoCostSection: 'Instead of paying Snowflake per-second compute credit markups on 140 TB of log scans, workloads run on our own AWS EC2 spot/reserved instances in EKS. Note: we will validate exact EC2 + IOMETE license TCO against our top 10 Snowflake queries during a 2-week pilot.',
      cisoSecuritySection: 'Eliminates ungoverned CSV exports on laptops/buckets by enforcing centralized Iceberg RBAC and dynamic PII masking inside our own AWS VPC.',
      recommendedPilot: 'Run a 14-day pilot on 12 TB of raw S3 clickstream logs + 1 hourly POS dbt model + 1 PySpark propensity notebook, while leaving our 45 Fivetran connectors untouched.'
    }
  }
];

export const COMPETITIVE_LANDSCAPE = [
  {
    category: 'Account Intelligence & Intent',
    examples: '6sense, ZoomInfo, Demandbase',
    whatTheyDoWell: 'Predictive account scoring from firmographics and web buying intent signals.',
    whereTheyFallShort: 'Scores whether an account is "in market", NOT whether IOMETE maps to their specific workflows. Opaque black-box numbers.',
    fitLensEdge: 'Workflow-level mapping to 26 documented IOMETE capabilities with visible math.'
  },
  {
    category: 'Enrichment & AI Research Workspaces',
    examples: 'Clay, Apollo, Octave, Aomni',
    whatTheyDoWell: 'Pull company firmographics, run generic AI prompts per row, draft cold emails.',
    whereTheyFallShort: 'No curated vendor capability KB, no line-by-line evidence links, and no first-class "Unknown" gap handling.',
    fitLensEdge: '100% source-grounded in docs.iomete.com; missing inputs become discovery questions.'
  },
  {
    category: 'Conversation Intelligence',
    examples: 'Gong, Chorus',
    whatTheyDoWell: 'Analyze recorded sales calls after they happen.',
    whereTheyFallShort: 'Zero help before the first call is booked or while qualifying an account brief.',
    fitLensEdge: 'Pre-call qualification, objection prep, talk track, and buyer justification memo.'
  },
  {
    category: 'General LLMs (Raw Prompts)',
    examples: 'ChatGPT, Claude, Perplexity',
    whatTheyDoWell: 'Free, flexible, can read any pasted .md file.',
    whereTheyFallShort: 'Flatters every company (8/10 hype machine), invents unverified product claims, and scores drift from run to run.',
    fitLensEdge: 'Pure code computes the score; hard disqualifiers say NO; validator blocks unlinked claims.'
  }
];
