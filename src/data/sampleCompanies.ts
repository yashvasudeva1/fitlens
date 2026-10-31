export interface SampleCompany {
  id: string;
  name: string;
  industry: string;
  tagline: string;
  expectedVerdict: 'Strong fit' | 'Weak fit' | 'Possible fit';
  expectedScoreRange: string;
  badgeColor: string;
  rationale: string;
  markdownContent: string;
}

export const MD_TEMPLATE = `## 1. Business Context & Overview
- Company Name: [e.g. Acme Corp]
- Industry / Domain: [e.g. Financial Services / Healthcare / E-commerce]
- Primary Business Model: [e.g. High-frequency transactions, patient portals, SaaS platform]
- Regulatory Mandates: [e.g. GDPR, HIPAA, SOC 2 Type II, FedRAMP, PCI-DSS, None]

## 2. Core Data Workflows
- Workflow 1: [e.g. Daily financial transaction reconciliation across 12 banking entities]
- Workflow 2: [e.g. Customer churn prediction ML pipelines and feature store]
- Workflow 3: [e.g. Real-time clickstream event streaming for personalized storefront offers]
- Workflow 4: [e.g. Executive BI dashboard reporting with 400 concurrent business analysts]

## 3. Data Sources, Scale & Formats
- Current Total Volume: [e.g. 3.5 Petabytes / 80 Terabytes / 15 Gigabytes]
- Monthly Ingestion Rate: [e.g. +120 Terabytes/month / +50 Gigabytes/month]
- Data Formats: [e.g. Parquet, JSON, Apache Kafka event streams, CSV, Relational tables]
- Primary Storage Layer: [e.g. AWS S3, MinIO On-Premise Object Storage, GCP GCS, Azure ADLS]

## 4. Current Technology Stack
- Query / Warehouse Engine: [e.g. Snowflake Enterprise Edition, Databricks, PostgreSQL, BigQuery]
- Compute Infrastructure: [e.g. Bare-metal on-premise Kubernetes clusters, AWS EKS, Managed PaaS]
- Orchestration & Transformation: [e.g. Apache Airflow, dbt Core, Python scripts, Cron jobs]
- BI / Analytics Visualization: [e.g. Apache Superset, Tableau, PowerBI, Metabase]

## 5. Team Composition & Technical Readiness
- Data Engineering Team Size: [e.g. 8 dedicated data platform engineers, 12 analytics engineers]
- Distributed Systems Skills: [e.g. Strong Apache Spark, PySpark, Iceberg, and Docker/Kubernetes experience]
- Operational Capability: [e.g. Dedicated 24/7 Platform Ops team managing self-hosted infrastructure]

## 6. Constraints, Residency & Compliance
- Data Sovereignty Requirement: [e.g. ZERO data can leave on-premise datacenter or national borders]
- Cloud & SaaS Policy: [e.g. Air-gapped network isolated from public internet / Multi-tenant SaaS strictly prohibited]
- Access Control Requirements: [e.g. Fine-grained column-level and row-level masking on customer tax IDs]

## 7. Pain Points & Buying Triggers
- Cost Pressure: [e.g. Snowflake compute credits spiked 140% year-over-year to $1.8M/year]
- Lock-in Anxiety: [e.g. Trapped inside proprietary micro-partitions and cannot query data with external tools]
- Performance Bottlenecks: [e.g. Batch ETL taking 9 hours, missing 6:00 AM trading desk SLAs]
`;

export const SAMPLE_COMPANIES: SampleCompany[] = [
  {
    id: 'sample_apex_bank',
    name: 'Apex Sovereign Bank & Defense Group',
    industry: 'Tier-1 Banking & Defense Systems',
    tagline: 'High-security regulated enterprise with strict air-gapped sovereignty needs',
    expectedVerdict: 'Strong fit',
    expectedScoreRange: '88% - 92%',
    badgeColor: 'bg-[#2D382D] text-white',
    rationale: 'Perfect alignment: 4.2 PB scale, mandatory air-gapped Kubernetes deployment, strong PySpark engineering team, escaping $2.1M Snowflake credit markup.',
    markdownContent: `## 1. Business Context & Overview
- Company Name: Apex Sovereign Financial & Defense Corp
- Industry / Domain: Tier-1 Regulated Banking & Secure Defense Systems
- Primary Business Model: Clears international sovereign bond settlements and confidential institutional risk contracts
- Regulatory Mandates: EU GDPR Data Residency, FedRAMP High, PCI-DSS 4.0, BaFin Banking Enclave Isolation

## 2. Core Data Workflows
- Workflow 1: Real-time fraud detection and risk ledger validation across 45 million daily transactions
- Workflow 2: High-throughput PySpark feature engineering pipelines for algorithmic market stress simulations
- Workflow 3: Air-gapped institutional compliance auditing with exact point-in-time financial state queries
- Workflow 4: Executive risk BI reporting serving 600 concurrent risk officers and credit analysts

## 3. Data Sources, Scale & Formats
- Current Total Volume: 4.2 Petabytes of historical transactions, tick logs, and encrypted audit trails
- Monthly Ingestion Rate: +180 Terabytes per month of new streaming tick logs and settlement ledgers
- Data Formats: Apache Parquet, Snappy compressed JSON, Apache Kafka event streams, Iceberg tables
- Primary Storage Layer: On-premise Ceph/MinIO S3-compatible object storage across two private datacenters

## 4. Current Technology Stack
- Query / Warehouse Engine: Snowflake (hybrid deployment) and legacy Cloudera CDH on-premise cluster
- Compute Infrastructure: Self-hosted enterprise Kubernetes (Rancher / OpenShift on bare-metal servers)
- Orchestration & Transformation: Apache Airflow 2.8, dbt Core, custom PySpark 3.4 job pipelines
- BI / Analytics Visualization: Apache Superset and Tableau Server connected via JDBC

## 5. Team Composition & Technical Readiness
- Data Engineering Team Size: 14 senior data platform engineers, 8 MLOps engineers, 6 Kubernetes DevOps leads
- Distributed Systems Skills: Deep expertise in Apache Spark, Iceberg internals, Helm charts, and Linux container tuning
- Operational Capability: Mature 24/7 internal platform engineering team capable of managing self-hosted cluster nodes

## 6. Constraints, Residency & Compliance
- Data Sovereignty Requirement: ZERO data, metadata, or query logs may leave the internal sovereign datacenter perimeter
- Cloud & SaaS Policy: Multi-tenant public cloud SaaS is strictly prohibited by central banking regulators; air-gapped operation required
- Access Control Requirements: Mandatory column-level cryptographic masking on SWIFT codes, SSNs, and trade counterparties

## 7. Pain Points & Buying Triggers
- Cost Pressure: Snowflake compute credit charges hit $2.1M last year, with 70% of cost representing cloud compute markup
- Lock-in Anxiety: Board-level directive to decouple storage into open Apache Iceberg format to prevent vendor hostage situations
- Performance Bottlenecks: End-of-month regulatory stress simulation takes 14 hours due to multi-tenant cloud throttling
`
  },
  {
    id: 'sample_petite_pulse',
    name: 'PetitePulse HealthTech (Negative Control)',
    industry: 'Early-Stage Mobile Consumer App',
    tagline: 'Seed-stage consumer startup with a single managed Postgres database and no data team',
    expectedVerdict: 'Weak fit',
    expectedScoreRange: '20% - 25%',
    badgeColor: 'bg-red-800 text-white',
    rationale: 'Negative control proof: Only 14 GB data, 3 web developers, zero Kubernetes skills, hard requirement for zero-ops managed SaaS. Disqualifier triggers and honestly says NO.',
    markdownContent: `## 1. Business Context & Overview
- Company Name: PetitePulse HealthTech
- Industry / Domain: B2C Mobile Wellness & Habit Tracker
- Primary Business Model: $7.99/month mobile subscription for guided breathing and step tracking
- Regulatory Mandates: Basic Apple App Store privacy compliance; standard HIPAA disclaimer

## 2. Core Data Workflows
- Workflow 1: Single nightly SQL script running on AWS RDS to tally daily active users and retention cohorts
- Workflow 2: Sending weekly notification emails based on user streak counts
- Workflow 3: Ad-hoc Metabase dashboard for the 2 co-founders to review monthly recurring revenue (MRR)

## 3. Data Sources, Scale & Formats
- Current Total Volume: 14 Gigabytes (12 GB in relational database, 2 GB image avatars in S3)
- Monthly Ingestion Rate: Less than 800 Megabytes per month
- Data Formats: Standard relational PostgreSQL tables, tiny JSON payloads
- Primary Storage Layer: AWS RDS PostgreSQL (db.t4g.small instance)

## 4. Current Technology Stack
- Query / Warehouse Engine: AWS RDS PostgreSQL single node
- Compute Infrastructure: AWS App Runner and Vercel serverless functions (Zero Kubernetes)
- Orchestration & Transformation: GitHub Actions scheduled cron job running a Node.js script
- BI / Analytics Visualization: Metabase cloud instance ($85/month)

## 5. Team Composition & Technical Readiness
- Data Engineering Team Size: 0 dedicated data engineers (3 full-stack TypeScript/React Native developers)
- Distributed Systems Skills: None. No experience with Apache Spark, Hadoop, Iceberg, or Kubernetes
- Operational Capability: Team insists on 100% serverless, zero-maintenance, zero-infrastructure operational overhead

## 6. Constraints, Residency & Compliance
- Data Sovereignty Requirement: None. AWS us-east-1 multi-tenant cloud is completely satisfactory
- Cloud & SaaS Policy: Strictly requires turnkey managed SaaS; team cannot and will not manage containers or Helm charts
- Access Control Requirements: Basic application password authentication; no fine-grained role matrices needed

## 7. Pain Points & Buying Triggers
- Cost Pressure: AWS bill is currently $140/month; no compute cost pressure whatsoever
- Lock-in Anxiety: None; standard PostgreSQL dump is sufficient
- Performance Bottlenecks: None; daily cohort query completes in 4.2 seconds
`
  },
  {
    id: 'sample_cloudmart',
    name: 'CloudMart OmniRetail Global',
    industry: 'Mid-Market E-Commerce & Retail',
    tagline: 'Growing omnichannel merchant facing runaway Snowflake warehouse compute bills',
    expectedVerdict: 'Possible fit',
    expectedScoreRange: '62% - 66%',
    badgeColor: 'bg-amber-800 text-white',
    rationale: 'Nuanced mid-market scenario: 120 TB scale, heavy Snowflake credit friction, 4 data engineers with Spark familiarity, but lacks dedicated on-prem Kubernetes infrastructure (operates on AWS EKS). High-value discovery questions required.',
    markdownContent: `## 1. Business Context & Overview
- Company Name: CloudMart Omnichannel Retail
- Industry / Domain: Mid-Enterprise E-Commerce & 140 Physical Retail Storefronts
- Primary Business Model: Omnichannel apparel and consumer electronics retail
- Regulatory Mandates: PCI-DSS for POS payment terminals, CCPA/GDPR for online consumer data

## 2. Core Data Workflows
- Workflow 1: Daily inventory reconciliation and store replenishment forecasting across 140 retail locations
- Workflow 2: Customer lifetime value (LTV) cohort modeling and marketing attribution pipelines
- Workflow 3: Real-time point-of-sale telemetry ingestion from retail registers via AWS Kinesis
- Workflow 4: Tableau executive sales dashboards accessed by 120 merchandising and inventory planners

## 3. Data Sources, Scale & Formats
- Current Total Volume: 120 Terabytes of historical POS receipts, order histories, and clickstream events
- Monthly Ingestion Rate: +8.5 Terabytes per month of new transaction logs
- Data Formats: Parquet files, CSV partner exports, AWS Kinesis streaming JSON
- Primary Storage Layer: AWS S3 standard bucket (us-east-1)

## 4. Current Technology Stack
- Query / Warehouse Engine: Snowflake Business Critical Edition (Standard 2X-Large warehouses)
- Compute Infrastructure: AWS EKS (Kubernetes managed by AWS) for core microservices
- Orchestration & Transformation: dbt Core orchestrated via Astronomer Airflow
- BI / Analytics Visualization: Tableau Online connected directly to Snowflake

## 5. Team Composition & Technical Readiness
- Data Engineering Team Size: 4 data engineers, 3 analytics engineers (no dedicated platform/infrastructure SRE)
- Distributed Systems Skills: Moderate experience with PySpark, strong SQL/dbt, basic AWS EKS familiarity
- Operational Capability: Prefers managed automation; reluctant to troubleshoot raw distributed cluster nodes

## 6. Constraints, Residency & Compliance
- Data Sovereignty Requirement: Commercial AWS cloud in US region is approved; must maintain SOC 2 compliance
- Cloud & SaaS Policy: Flexible. Open to Bring-Your-Own-Cloud (BYOC) running in company's AWS VPC
- Access Control Requirements: Masking credit card numbers and loyalty customer addresses for merchandising analysts

## 7. Pain Points & Buying Triggers
- Cost Pressure: Snowflake compute costs jumped from $280K to $740K in the past 18 months, triggering an internal audit
- Lock-in Anxiety: Concerned about proprietary Snowflake storage format; CTO wants standard Iceberg tables
- Performance Bottlenecks: Peak holiday flash-sale queries cause warehouse auto-scaling spikes and budget overruns
`
  }
];
