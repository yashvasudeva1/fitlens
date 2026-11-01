export type FitDimensionId =
  | 'sovereignty'
  | 'scale'
  | 'openness'
  | 'workloads'
  | 'cost'
  | 'readiness'
  | 'governance';

export interface IometeCapability {
  id: string;
  name: string;
  category: 'Deployment & Sovereignty' | 'Storage & Open Formats' | 'Compute & Workloads' | 'Governance & Security' | 'Operations & Cost';
  dimensionId: FitDimensionId;
  plainDescription: string;
  docUrl: string;
  fitsWhen: string[];
  doesNotFitWhen: string[];
  commonObjections: string;
  honestResponse: string;
  maturityNote: 'verified' | 'unverified';
}

export const KB_VERSION = 'iomete_capabilities_v2.6 (26 Curated Entries)';

export const IOMETE_CAPABILITIES: IometeCapability[] = [
  {
    id: 'cap-sovereign-byoc',
    name: 'Sovereign Customer-Cloud Deployment (BYOC)',
    category: 'Deployment & Sovereignty',
    dimensionId: 'sovereignty',
    plainDescription: 'Runs the entire data platform inside your own AWS, GCP, or Azure account so raw data never leaves your network perimeter.',
    docUrl: 'https://docs.iomete.com/deployment/cloud-deployment',
    fitsWhen: [
      'Data residency laws or internal security policies forbid sending tables to a vendor-hosted multi-tenant cloud',
      'Company wants cloud elasticity while keeping IAM and VPC ownership'
    ],
    doesNotFitWhen: [
      'Team has zero cloud infrastructure access and wants a 100% vendor-hosted SaaS login with no VPC setup'
    ],
    commonObjections: 'Managing a data plane in our own VPC sounds heavier than signing into a SaaS warehouse.',
    honestResponse: 'True: you must provision a Kubernetes cluster in your VPC, though IOMETE automates cluster lifecycle via Helm/Terraform.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-airgapped-onprem',
    name: 'Air-Gapped & On-Premises Data Plane',
    category: 'Deployment & Sovereignty',
    dimensionId: 'sovereignty',
    plainDescription: 'Operates inside physically isolated data centers with zero outbound internet connectivity, shipping all container images via private registries.',
    docUrl: 'https://docs.iomete.com/deployment/on-prem-air-gapped',
    fitsWhen: [
      'Defense, intelligence, central banking, or regulated healthcare networks with strict air-gap mandates',
      'Existing bare-metal or OpenShift / Rancher hardware investments on premises'
    ],
    doesNotFitWhen: [
      'Cloud-native startups with no on-prem hardware or regulatory constraints'
    ],
    commonObjections: 'Upgrading software in an air-gapped enclave takes months of manual patching.',
    honestResponse: 'IOMETE ships self-contained offline Helm bundles, though your infra team still controls the internal registry mirror.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-hybrid-federation',
    name: 'Hybrid Multi-Region Lakehouse Topology',
    category: 'Deployment & Sovereignty',
    dimensionId: 'sovereignty',
    plainDescription: 'Connects on-premises object storage and cloud buckets under a single unified Iceberg catalog across jurisdictions.',
    docUrl: 'https://docs.iomete.com/architecture/hybrid-cloud',
    fitsWhen: [
      'Gradual cloud migration where sensitive PII stays on-prem while analytics bursts to cloud',
      'Multi-country banking where EU and APAC data must stay within regional borders'
    ],
    doesNotFitWhen: [
      'Single-region apps with a single transactional database'
    ],
    commonObjections: 'Cross-environment queries can hit network egress bottlenecks if data is joined across regions.',
    honestResponse: 'Keep compute local to each region and federate aggregated Iceberg metadata rather than pulling raw terabytes over WAN.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-k8s-native',
    name: 'Kubernetes-Native Compute Orchestration',
    category: 'Deployment & Sovereignty',
    dimensionId: 'readiness',
    plainDescription: 'Packages every query engine and Spark job as standard Kubernetes pods that scale up and down on your existing K8s clusters.',
    docUrl: 'https://docs.iomete.com/deployment/kubernetes-requirements',
    fitsWhen: [
      'Platform or DevOps team already operates EKS, GKE, AKS, OpenShift, or Vanilla Kubernetes',
      'Desire to unify application and data workloads on one infrastructure stack'
    ],
    doesNotFitWhen: [
      'No one in the company knows Kubernetes and there is no platform engineering support'
    ],
    commonObjections: 'Our data analysts do not know kubectl or Kubernetes YAML.',
    honestResponse: 'Analysts only see the web SQL editor and BI connection; only the initial platform installation touches Kubernetes.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-apache-iceberg',
    name: 'Open Apache Iceberg Table Format',
    category: 'Storage & Open Formats',
    dimensionId: 'openness',
    plainDescription: 'Stores all data in standard Apache Iceberg tables on S3/MinIO/ADLS so any engine (Spark, Trino, DuckDB, Flink) can read it without conversion.',
    docUrl: 'https://docs.iomete.com/lakehouse/apache-iceberg',
    fitsWhen: [
      'Fear of vendor lock-in from proprietary storage formats',
      'Need ACID transactions, schema evolution, and time-travel on cheap object storage'
    ],
    doesNotFitWhen: [
      'Sub-10ms OLTP point-lookup workloads (use Postgres/MySQL instead of a lakehouse)'
    ],
    commonObjections: 'Iceberg tables require background compaction or small files slow down queries.',
    honestResponse: 'Accurate: streaming writes create small files, which is why IOMETE schedules automated table maintenance jobs.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-zero-lockin-parquet',
    name: 'Zero Vendor Lock-In & Direct Object Access',
    category: 'Storage & Open Formats',
    dimensionId: 'openness',
    plainDescription: 'Your files remain standard Parquet + Iceberg metadata in your own bucket; if you turn off IOMETE tomorrow, your data is still 100% readable.',
    docUrl: 'https://docs.iomete.com/architecture/open-formats',
    fitsWhen: [
      'Architectural mandate requiring exit portability and multi-engine interoperability',
      'Replacing expensive proprietary enterprise data warehouses'
    ],
    doesNotFitWhen: [
      'Teams that do not care about storage portability and only store a few gigabytes'
    ],
    commonObjections: 'Snowflake and Databricks also claim Iceberg support now.',
    honestResponse: 'They do, though IOMETE uses native open Iceberg as its primary first-class format on your own S3/MinIO without cloud markup.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-iceberg-timetravel',
    name: 'Snapshot Time-Travel & Rollback',
    category: 'Storage & Open Formats',
    dimensionId: 'governance',
    plainDescription: 'Lets you query data exactly as it looked at any past timestamp or instantly roll back a broken ETL pipeline to a clean snapshot.',
    docUrl: 'https://docs.iomete.com/lakehouse/time-travel',
    fitsWhen: [
      'Regulated financial audit trails and reproducible ML training datasets',
      'Frequent pipeline backfills where bad writes need instant atomic rollback'
    ],
    doesNotFitWhen: [
      'Simple CRUD apps that overwrite rows in place without historical audit needs'
    ],
    commonObjections: 'Keeping every historical snapshot increases object storage usage.',
    honestResponse: 'Snapshots share unchanged Parquet files, and you configure snapshot expiration policies per table.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-acid-merges',
    name: 'ACID Transactions & Upsert/Merge on Object Storage',
    category: 'Storage & Open Formats',
    dimensionId: 'scale',
    plainDescription: 'Supports concurrent SQL MERGE, UPDATE, and DELETE operations directly on petabyte-scale object storage without corrupting readers.',
    docUrl: 'https://docs.iomete.com/lakehouse/acid-transactions',
    fitsWhen: [
      'CDC (Change Data Capture) replication from transactional databases into the lakehouse',
      'GDPR right-to-be-forgotten row deletions across large historical tables'
    ],
    doesNotFitWhen: [
      'High-frequency transactional order processing (thousands of single-row updates per second)'
    ],
    commonObjections: 'Object storage was never designed for row-level updates.',
    honestResponse: 'Iceberg handles this via merge-on-read and copy-on-write delete vectors, suitable for analytical batches and micro-batches.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-petabyte-scale',
    name: 'Petabyte-Scale Structured & Semi-Structured Storage',
    category: 'Storage & Open Formats',
    dimensionId: 'scale',
    plainDescription: 'Decouples cheap S3/MinIO/Ceph object storage from compute so you can store 100 TB to 10+ PB of logs, JSON, and tables at object-store rates.',
    docUrl: 'https://docs.iomete.com/architecture/storage-layer',
    fitsWhen: [
      'High-volume telemetry, IoT streams, core banking ledgers, or clickstream archives > 10 TB',
      'Combining relational tables with raw JSON/Parquet/Avro feeds'
    ],
    doesNotFitWhen: [
      'Total company dataset is under 100 GB and fits comfortably in a single Postgres instance'
    ],
    commonObjections: 'Object storage latency is higher than local NVMe SSDs on a single Postgres box.',
    honestResponse: 'For small datasets (<100 GB), Postgres is faster and simpler. IOMETE shines when data outgrows single-node databases.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-s3-minio-ceph',
    name: 'On-Prem S3-Compatible Storage (MinIO, Ceph, Dell ECS, NetApp)',
    category: 'Storage & Open Formats',
    dimensionId: 'sovereignty',
    plainDescription: 'Works natively with on-premises S3-compatible object stores like MinIO, Red Hat Ceph, Dell ECS, and NetApp StorageGRID.',
    docUrl: 'https://docs.iomete.com/deployment/object-storage',
    fitsWhen: [
      'Enterprises replacing legacy Hadoop HDFS with modern on-prem object storage',
      'Sovereign environments using MinIO or Ceph instead of AWS S3'
    ],
    doesNotFitWhen: [
      'Legacy SAN/NAS block-only storage with no S3 API gateway'
    ],
    commonObjections: 'Legacy Hadoop clusters currently store data in HDFS, not S3.',
    honestResponse: 'Migrating off HDFS to MinIO/S3 is a prerequisite or phase-1 step during Hadoop modernization.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-managed-spark',
    name: 'Auto-Scaling Apache Spark Compute Clusters',
    category: 'Compute & Workloads',
    dimensionId: 'workloads',
    plainDescription: 'Spins up isolated Apache Spark clusters on Kubernetes in seconds and scales executors down to zero when idle.',
    docUrl: 'https://docs.iomete.com/compute/spark-clusters',
    fitsWhen: [
      'Multi-team data engineering and BI workloads with spiky daytime traffic',
      'Replacing static 24/7 Hadoop/YARN clusters that sit idle overnight'
    ],
    doesNotFitWhen: [
      'Teams with zero analytical SQL or Spark workload requirements'
    ],
    commonObjections: 'Cold-starting Kubernetes pods takes longer than instant serverless SaaS warehouses.',
    honestResponse: 'Warm node pools keep startup under 5-15 seconds, though a completely cold K8s node autoscaler can take 60-90 seconds.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-serverless-spark-jobs',
    name: 'Scheduled & Event-Driven Spark Jobs (ETL/ELT)',
    category: 'Compute & Workloads',
    dimensionId: 'workloads',
    plainDescription: 'Runs production PySpark, Scala, Java, or SQL batch & streaming jobs via REST API, Airflow, or built-in cron scheduler with isolated compute.',
    docUrl: 'https://docs.iomete.com/compute/spark-jobs',
    fitsWhen: [
      'Heavy ETL pipelines, nightly regulatory reporting, and ML feature engineering',
      'Existing Airflow, Dagster, or Prefect orchestration needing an execution engine'
    ],
    doesNotFitWhen: [
      'Simple 5-table SaaS syncs already handled by a basic Fivetran + BI setup'
    ],
    commonObjections: 'Debugging Spark out-of-memory errors requires data engineering skill.',
    honestResponse: 'IOMETE exposes Spark UI logs and memory metrics cleanly, but complex PySpark tuning still benefits from data engineering experience.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-sql-worksheet',
    name: 'Browser-Based Collaborative SQL Editor & Worksheets',
    category: 'Compute & Workloads',
    dimensionId: 'workloads',
    plainDescription: 'Provides a built-in web SQL IDE with autocomplete, schema browser, query history, and shareable worksheets for analysts.',
    docUrl: 'https://docs.iomete.com/sql-editor/overview',
    fitsWhen: [
      'Data analysts and business teams needing self-serve SQL exploration without installing local tools',
      'Sharing repeatable validation queries across data and compliance teams'
    ],
    doesNotFitWhen: [
      'Non-technical users who only consume static PDF reports and never run SQL'
    ],
    commonObjections: 'Does it replace full enterprise BI suites like Tableau or PowerBI?',
    honestResponse: 'No-the SQL editor is for exploration and lightweight charts; for executive dashboards, connect Tableau, PowerBI, or Superset via JDBC.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-dbt-adapter',
    name: 'Native dbt-iomete Transformation Adapter',
    category: 'Compute & Workloads',
    dimensionId: 'readiness',
    plainDescription: 'Lets analytics engineers build modular SQL transformations, lineage, and data tests using standard dbt Core workflows against IOMETE.',
    docUrl: 'https://docs.iomete.com/integrations/dbt',
    fitsWhen: [
      'Teams already using dbt on Snowflake, BigQuery, or Databricks who want portable SQL models',
      'Software-engineering-style CI/CD for SQL data transformations'
    ],
    doesNotFitWhen: [
      'Organizations with no SQL transformation pipeline'
    ],
    commonObjections: 'Snowflake-specific SQL macros in existing dbt projects may need refactoring.',
    honestResponse: 'Standard ANSI/Spark SQL ports cleanly, but proprietary warehouse macros require minor syntax adjustments during migration.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-bi-jdbc-flight',
    name: 'High-Throughput JDBC/ODBC & Arrow Flight SQL Connectivity',
    category: 'Compute & Workloads',
    dimensionId: 'workloads',
    plainDescription: 'Connects PowerBI, Tableau, Apache Superset, Metabase, and Looker directly to the lakehouse over standard JDBC/ODBC drivers.',
    docUrl: 'https://docs.iomete.com/integrations/bi-tools',
    fitsWhen: [
      'Consolidating BI reporting directly on lakehouse tables without copying data into separate marts',
      'Replacing expensive BI extracts with live lakehouse queries'
    ],
    doesNotFitWhen: [
      'Sub-100ms customer-facing embedded analytics serving 10,000 concurrent web users'
    ],
    commonObjections: 'Spark SQL latency on cold tables can feel slower than in-memory OLAP cubes.',
    honestResponse: 'Sizing dedicated always-warm SQL lakehouse endpoints and partitioning Iceberg tables properly keeps BI queries responsive.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-jupyter-ml',
    name: 'Python / PySpark & ML Notebook Integration',
    category: 'Compute & Workloads',
    dimensionId: 'workloads',
    plainDescription: 'Connects Jupyter notebooks and ML training pipelines directly to Iceberg tables for feature engineering and distributed model prep.',
    docUrl: 'https://docs.iomete.com/integrations/jupyter',
    fitsWhen: [
      'Data science teams training fraud, risk, or recommendation models on large historical datasets',
      'Unifying SQL analytics and Python ML on one copy of the data'
    ],
    doesNotFitWhen: [
      'Pure LLM prompt wrappers that do not train or evaluate on tabular/enterprise datasets'
    ],
    commonObjections: 'Does IOMETE include a full proprietary AutoML studio like Databricks Mosaic?',
    honestResponse: 'IOMETE focuses on the core Spark + Iceberg compute and data layer; your data scientists bring their preferred Python/MLflow tools.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-iceberg-rest-catalog',
    name: 'Unified Iceberg REST Catalog & Metadata Service',
    category: 'Governance & Security',
    dimensionId: 'governance',
    plainDescription: 'Provides a central catalog of all schemas, tables, views, and partitions so multiple compute clusters and external engines see a single source of truth.',
    docUrl: 'https://docs.iomete.com/lakehouse/catalog',
    fitsWhen: [
      'Organizations struggling with dark data scattered across dozens of raw S3 buckets',
      'Multi-engine architectures sharing tables between Spark, Trino, and Flink'
    ],
    doesNotFitWhen: [
      'Single-database startups with 15 tables in one schema'
    ],
    commonObjections: 'Third-party roundups claim IOMETE has thinner enterprise data catalog features than standalone tools like Collibra.',
    honestResponse: 'IOMETE provides technical Iceberg metadata and RBAC catalog governance; enterprises needing business glossaries integrate OpenMetadata or DataHub.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-rbac-abac',
    name: 'Fine-Grained Role & Attribute-Based Access Control (RBAC/ABAC)',
    category: 'Governance & Security',
    dimensionId: 'governance',
    plainDescription: 'Enforces central permissions down to the database, table, column, and row level across SQL and Spark jobs.',
    docUrl: 'https://docs.iomete.com/security/access-control',
    fitsWhen: [
      'Multi-department enterprises where finance, HR, and product teams share one lakehouse',
      'Strict compliance mandates (HIPAA, PCI-DSS, GDPR, DORA)'
    ],
    doesNotFitWhen: [
      'Small teams where every developer has full admin access to all data'
    ],
    commonObjections: 'In many lakehouses, users can bypass SQL access controls by reading raw S3 files directly in Python.',
    honestResponse: 'IOMETE enforces access policies at the compute and credential broker layer so users never receive raw bucket keys.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-row-col-masking',
    name: 'Dynamic Column Masking & Row-Level Filtering',
    category: 'Governance & Security',
    dimensionId: 'governance',
    plainDescription: 'Automatically redacts PII columns (like SSN or IBAN) or filters rows by region based on the querying user’s identity group.',
    docUrl: 'https://docs.iomete.com/security/data-masking',
    fitsWhen: [
      'Sharing production tables with analysts without creating 10 sanitized copies',
      'Multi-tenant or multi-country compliance boundaries'
    ],
    doesNotFitWhen: [
      'Public or non-sensitive datasets with zero PII'
    ],
    commonObjections: 'Maintaining masking rules across hundreds of tables takes governance discipline.',
    honestResponse: 'Tag-based policies (ABAC) let you attach a single `PII` tag to columns so masking applies automatically.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-sso-ldap-oidc',
    name: 'Enterprise SSO (OIDC, SAML, Active Directory / LDAP)',
    category: 'Governance & Security',
    dimensionId: 'governance',
    plainDescription: 'Integrates with Okta, Azure AD / Entra ID, Keycloak, and on-prem LDAP so user roles sync automatically with corporate identity.',
    docUrl: 'https://docs.iomete.com/security/single-sign-on',
    fitsWhen: [
      'Enterprise IT security requirements mandating centralized identity and group sync',
      'On-premises Active Directory environments'
    ],
    doesNotFitWhen: [
      'Solo hobby projects'
    ],
    commonObjections: 'On-prem LDAP group mappings can be tricky during initial setup.',
    honestResponse: 'Standard OIDC/LDAP group sync is supported out of the box and verified during pilot onboarding.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-audit-logging',
    name: 'Immutable Query & Access Audit Logs',
    category: 'Governance & Security',
    dimensionId: 'governance',
    plainDescription: 'Records every SQL query, schema change, permission grant, and login event for security SIEM ingestion and regulatory audits.',
    docUrl: 'https://docs.iomete.com/security/audit-logs',
    fitsWhen: [
      'SOC2, ISO27001, DORA, and banking supervisory audits requiring full query provenance'
    ],
    doesNotFitWhen: [
      'Unregulated prototypes'
    ],
    commonObjections: 'Does it include automated anomaly alerting out of the box?',
    honestResponse: 'Audit logs export cleanly to your existing SIEM (Splunk, Datadog, Elastic) where security alerting rules run.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-cost-no-markup',
    name: 'Transparent Compute Pricing Without Cloud Storage/Credit Markup',
    category: 'Operations & Cost',
    dimensionId: 'cost',
    plainDescription: 'Because IOMETE runs on your own cloud or on-prem hardware, you pay your cloud provider directly for spot/reserved nodes and S3 with no per-query credit markup.',
    docUrl: 'https://docs.iomete.com/overview/pricing-architecture',
    fitsWhen: [
      'Organizations suffering from unpredictable Snowflake/Databricks consumption credit spikes',
      'Enterprises with existing AWS/Azure committed spend discounts or amortized on-prem servers'
    ],
    doesNotFitWhen: [
      'Tiny teams spending $100/month on cloud queries where base cluster infrastructure costs more'
    ],
    commonObjections: 'We still have to pay for the underlying Kubernetes nodes and storage.',
    honestResponse: 'Always verify against your actual workload: savings come from avoiding 2x-4x managed compute credit markups and using spot/reserved instances at scale.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-auto-compaction',
    name: 'Automated Iceberg Table Compaction & Snapshot Expiry',
    category: 'Operations & Cost',
    dimensionId: 'cost',
    plainDescription: 'Runs background optimization jobs to merge small Parquet files, sort partitions, and clean up orphaned files to keep queries fast and storage lean.',
    docUrl: 'https://docs.iomete.com/lakehouse/table-maintenance',
    fitsWhen: [
      'Streaming or frequent micro-batch ingestion that would otherwise degrade query speeds',
      'Controlling S3 API request costs and storage bloat'
    ],
    doesNotFitWhen: [
      'Static write-once archives'
    ],
    commonObjections: 'Compaction jobs consume compute cycles of their own.',
    honestResponse: 'True: you schedule compaction on low-cost off-peak compute pools.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-kafka-streaming',
    name: 'Spark Structured Streaming & Kafka Ingestion',
    category: 'Compute & Workloads',
    dimensionId: 'scale',
    plainDescription: 'Ingests real-time event streams from Apache Kafka, Redpanda, or Kinesis directly into transactional Iceberg tables.',
    docUrl: 'https://docs.iomete.com/integrations/kafka-streaming',
    fitsWhen: [
      'Fraud detection, telemetry pipelines, and real-time operational logs landing in the lakehouse',
      'Replacing complex Lambda architectures with a single streaming + batch table format'
    ],
    doesNotFitWhen: [
      'Sub-millisecond complex event processing requiring dedicated stateful stream processors'
    ],
    commonObjections: 'Third-party listings note fewer pre-built point-and-click SaaS connectors (like Salesforce/HubSpot) compared to Fivetran.',
    honestResponse: 'Honest trade-off: IOMETE is the core Lakehouse compute/storage engine, not a 500-connector SaaS ELT tool. Pair it with Airbyte, Debezium, or Fivetran for SaaS APIs.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-hadoop-migration',
    name: 'Legacy Hadoop / Cloudera (HDFS & Hive) Modernization Path',
    category: 'Operations & Cost',
    dimensionId: 'cost',
    plainDescription: 'Replaces brittle Hive + HDFS + YARN clusters with containerized Spark + Iceberg on Kubernetes while keeping existing Spark/HiveSQL logic compatible.',
    docUrl: 'https://docs.iomete.com/migration/hadoop-cloudera-to-iomete',
    fitsWhen: [
      'Enterprises facing expensive Cloudera license renewals or expiring data center Hadoop hardware',
      'Existing Hive/Spark SQL codebase that cannot be rewritten from scratch for proprietary cloud warehouses'
    ],
    doesNotFitWhen: [
      'Greenfield startups that never used Hadoop or Spark'
    ],
    commonObjections: 'Migrating legacy Hive tables and oozie workflows takes careful testing.',
    honestResponse: 'Iceberg provides in-place table migration commands (`migrate` / `snapshot`) so you do not have to rewrite petabytes of Parquet files at once.',
    maturityNote: 'verified'
  },
  {
    id: 'cap-git-data-branching',
    name: 'Iceberg Branching & Tagging for Isolated Data Testing (WAP)',
    category: 'Storage & Open Formats',
    dimensionId: 'openness',
    plainDescription: 'Lets data engineers create zero-copy Git-like branches of tables (`Write-Audit-Publish`) to test pipeline changes before merging to production.',
    docUrl: 'https://docs.iomete.com/lakehouse/branching-and-tagging',
    fitsWhen: [
      'High-stakes financial or executive reporting where bad data cannot reach production dashboards',
      'CI/CD testing on full-scale production data without duplicating storage costs'
    ],
    doesNotFitWhen: [
      'Teams without automated data quality checks'
    ],
    commonObjections: 'Not all downstream BI tools understand Iceberg branch syntax natively.',
    honestResponse: 'Engineers audit on the branch in Spark/SQL and fast-forward merge to `main` so BI tools simply read the main table.',
    maturityNote: ' unverified' === ' unverified' ? 'unverified' : 'verified'
  }
];

export const CAPABILITY_MAP: Record<string, IometeCapability> = Object.fromEntries(
  IOMETE_CAPABILITIES.map((cap) => [cap.id, cap])
);
