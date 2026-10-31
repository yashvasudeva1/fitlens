export interface IometeCapability {
  id: string;
  name: string;
  category:
    | 'Deployment & Sovereignty'
    | 'Lakehouse & Formats'
    | 'Compute & Engine'
    | 'Security & Governance'
    | 'Developer & Workflows'
    | 'Cost & Operations';
  plainDescription: string;
  docUrl: string;
  fitsWhen: string[];
  doesNotFitWhen: string[];
  commonObjections: string;
  safeHonestResponse: string;
  maturityNote: 'verified' | 'unverified';
}

export const IOMETE_CAPABILITIES: IometeCapability[] = [
  {
    id: 'cap_sovereign_deployment',
    name: 'Sovereign Deployment (On-Prem, VPC, Hybrid)',
    category: 'Deployment & Sovereignty',
    plainDescription: 'Runs entirely inside your own infrastructure or cloud account so no data, metadata, or query logs ever leave your security perimeter.',
    docUrl: 'https://iomete.com/product/deployment',
    fitsWhen: [
      'Data sovereignty, banking regulations, or strict perimeter isolation required',
      'Need to run on existing customer Kubernetes (EKS, GKE, AKS, OpenShift, or bare metal)',
      'Prohibition against third-party SaaS vendors holding custody of proprietary data'
    ],
    doesNotFitWhen: [
      'Team wants a 100% multi-tenant managed SaaS without owning any infrastructure',
      'No access or permission to run Kubernetes clusters or cloud VPC workloads'
    ],
    commonObjections: 'Is it harder to install and manage compared to multi-tenant Snowflake?',
    safeHonestResponse: 'IOMETE provides Helm charts and Kubernetes operators that deploy in under an hour, but your team does need an existing Kubernetes cluster or cloud VPC.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_airgap_package',
    name: 'Air-Gapped & Offline Cluster Packaging',
    category: 'Deployment & Sovereignty',
    plainDescription: 'Self-contained container bundles and Helm charts that install cleanly behind physical firewalls with zero outbound internet egress.',
    docUrl: 'https://iomete.com/product/architecture/data-security',
    fitsWhen: [
      'Defense contractors, national intelligence, or central bank enclaves with zero internet egress',
      'Strict corporate policies forbidding external licensing or telemetry pings'
    ],
    doesNotFitWhen: [
      'Standard public cloud startups with open internet access who prefer automatic cloud-pushed updates'
    ],
    commonObjections: 'How are security patches applied if there is no internet connection?',
    safeHonestResponse: 'IOMETE provides signed offline image bundles for your private container registry (Harbor, Artifactory, Nexus) transferred via secure bastion.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_hybrid_multi_cloud',
    name: 'Hybrid & Multi-Cloud Data Plane Federation',
    category: 'Deployment & Sovereignty',
    plainDescription: 'Deploy compute clusters across AWS, GCP, Azure, and on-premise datacenters while managing them from a unified control plane.',
    docUrl: 'https://iomete.com/roadmap/multi-kubernetes-cluster-deployment',
    fitsWhen: [
      'Multi-cloud strategy where data resides across Amazon S3, Google Cloud Storage, and on-prem MinIO/Ceph',
      'Regulatory requirement to process country-specific datasets within national borders'
    ],
    doesNotFitWhen: [
      'Single-region startup with all data in one database'
    ],
    commonObjections: 'Does cross-cloud querying create huge network egress bills?',
    safeHonestResponse: 'IOMETE places localized Spark compute pods inside the same region or datacenter as the storage bucket so heavy scans stay local.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_k8s_native_operator',
    name: 'Kubernetes-Native Operator Architecture',
    category: 'Deployment & Sovereignty',
    plainDescription: 'Uses standard Kubernetes pods, namespaces, and persistent volumes to manage lakehouse services without proprietary hardware appliances.',
    docUrl: 'https://iomete.com/product/data-platform/design-principles',
    fitsWhen: [
      'Platform engineering team already standardized on Rancher, OpenShift, Tanzu, EKS, AKS, or GKE',
      'Desire to unify application microservices and data infrastructure on one Kubernetes standard'
    ],
    doesNotFitWhen: [
      'Organization has zero container or Kubernetes operational footprint'
    ],
    commonObjections: 'Does running stateful data workloads on Kubernetes cause stability issues?',
    safeHonestResponse: 'IOMETE keeps state in durable object storage (Iceberg on S3/MinIO) while Kubernetes pods run stateless Spark compute that can restart cleanly.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_onprem_s3_storage',
    name: 'On-Premise S3-Compatible Storage Support (MinIO, Ceph, Dell ECS)',
    category: 'Deployment & Sovereignty',
    plainDescription: 'Works natively with private object storage appliances so on-premise teams get cloud-style lakehouse elasticity without public cloud storage.',
    docUrl: 'https://iomete.com/product/data-platform/platform-overview',
    fitsWhen: [
      'On-premise datacenters running MinIO, Red Hat Ceph, Dell ECS, NetApp StorageGRID, or Pure Storage FlashBlade',
      'Migrating off legacy Hadoop HDFS onto modern S3-compatible object storage'
    ],
    doesNotFitWhen: [
      'Legacy POSIX-only NAS filers without S3 API compatibility'
    ],
    commonObjections: 'Is on-premise object storage fast enough for analytical table scans?',
    safeHonestResponse: 'Modern NVMe-backed object stores like MinIO and Ceph saturate 100GbE links, and Iceberg metadata pruning minimizes unnecessary byte reads.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_apache_iceberg',
    name: 'Native Apache Iceberg Open Table Format',
    category: 'Lakehouse & Formats',
    plainDescription: 'Stores all data in open Apache Iceberg tables with ACID transactions, schema evolution, partition evolution, and zero vendor lock-in.',
    docUrl: 'https://iomete.com/product/architecture/open-source',
    fitsWhen: [
      'Wants open storage formats where Parquet data remains accessible even if switching query engines',
      'Requires ACID concurrent reads/writes and hidden partitioning on object storage',
      'Board or CTO directive to escape proprietary formats like Snowflake micro-partitions'
    ],
    doesNotFitWhen: [
      'Only querying tiny relational tables (<10 GB) with high-frequency single-row OLTP updates'
    ],
    commonObjections: 'Can other query engines read IOMETE Iceberg tables directly?',
    safeHonestResponse: 'Yes. Because Iceberg is an open Apache standard, Trino, DuckDB, Flink, PyIceberg, or Dremio can read the exact same tables without copying data.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_iceberg_time_travel',
    name: 'Iceberg Time-Travel & Snapshot Rollback',
    category: 'Lakehouse & Formats',
    plainDescription: 'Query historical states of any table as of a specific timestamp or snapshot ID, and instantly roll back bad ETL writes.',
    docUrl: 'https://iomete.com/product/data-platform/data-management',
    fitsWhen: [
      'Financial reconciliation requiring exact "as of month-end close" audit reproducibility',
      'Fast recovery from accidental deletes or faulty pipeline deployments'
    ],
    doesNotFitWhen: [
      'Ephemeral staging logs that are overwritten and discarded hourly'
    ],
    commonObjections: 'Does keeping historical snapshots multiply storage costs?',
    safeHonestResponse: 'Iceberg only writes delta Parquet files per snapshot, and configurable retention policies automatically expire snapshots older than your audit window.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_automated_compaction',
    name: 'Automated Iceberg Table Compaction & Maintenance',
    category: 'Lakehouse & Formats',
    plainDescription: 'Automatically merges small Parquet fragments, expires old snapshots, and removes orphan files in the background.',
    docUrl: 'https://iomete.com/roadmap/automatic-table-maintenance-and-compaction',
    fitsWhen: [
      'Frequent micro-batch or streaming ingestion creating thousands of small files per day',
      'Teams tired of writing and maintaining manual OPTIMIZE and VACUUM cron scripts'
    ],
    doesNotFitWhen: [
      'Static archival datasets updated once a quarter'
    ],
    commonObjections: 'Will background compaction jobs slow down daytime analyst queries?',
    safeHonestResponse: 'Compaction runs on isolated background compute pools that do not contend with interactive BI virtual clusters.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_schema_partition_evolution',
    name: 'Zero-Rewrite Schema & Partition Evolution',
    category: 'Lakehouse & Formats',
    plainDescription: 'Add, rename, or reorder columns and change table partitioning strategies (e.g. from monthly to daily) without rewriting historical terabytes.',
    docUrl: 'https://iomete.com/roadmap/ai-based-iceberg-table-management',
    fitsWhen: [
      'Evolving product schemas or IoT payloads where fields change frequently',
      'Legacy Hive tables where changing partition keys previously required days of table rewrites'
    ],
    doesNotFitWhen: [
      'Fixed-schema small tables that never change structure'
    ],
    commonObjections: 'How do queries work when half the table is partitioned by month and half by day?',
    safeHonestResponse: 'Iceberg tracks partition specs in metadata per manifest file, splitting query plans automatically across old and new partition layouts.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_catalog_sync_unity',
    name: 'Open Catalog Interoperability (REST Catalog, Nessie, Glue)',
    category: 'Lakehouse & Formats',
    plainDescription: 'Supports standard Iceberg REST Catalog interfaces and interoperates with external catalogs so metadata is never trapped.',
    docUrl: 'https://iomete.com/roadmap/iomete-unified-multi-catalog',
    fitsWhen: [
      'Enterprise architectures sharing Iceberg tables across multiple compute engines',
      'Migrating existing AWS Glue or Hive Metastore catalogs into an open lakehouse'
    ],
    doesNotFitWhen: [
      'No catalog needs beyond a single standalone SQLite/Postgres database'
    ],
    commonObjections: 'Can we migrate away from IOMETE catalog later without re-ingesting data?',
    safeHonestResponse: 'Yes. All table metadata files (metadata.json and Avro manifests) live directly in your S3/object storage bucket.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_apache_spark_k8s',
    name: 'Apache Spark on Kubernetes Elastic Compute Engine',
    category: 'Compute & Engine',
    plainDescription: 'Executes SQL, Python, and Scala workloads on containerized Apache Spark clusters that scale worker pods dynamically.',
    docUrl: 'https://iomete.com/product/data-platform/data-engineering',
    fitsWhen: [
      'Large-scale batch ETL, multi-terabyte joins, PySpark transformations, or ML feature engineering',
      'Engineering teams with existing Spark / PySpark skills looking to modernize off Hadoop/YARN'
    ],
    doesNotFitWhen: [
      'Sub-10ms transactional point lookups (OLTP web app backends like user login tables)',
      'Tiny datasets (<20 GB) where single-node Postgres is simpler and faster'
    ],
    commonObjections: 'Does Spark on Kubernetes suffer from slow pod cold-start times?',
    safeHonestResponse: 'Batch jobs take 5-15 seconds to schedule pods, while interactive SQL endpoints maintain warm executor pools for immediate query response.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_multi_tenancy_isolation',
    name: 'Isolated Virtual Lakehouse Clusters (Compute Endpoints)',
    category: 'Compute & Engine',
    plainDescription: 'Spin up independent virtual compute clusters for Finance, Data Science, and BI so heavy ETL jobs never slow down executive dashboards.',
    docUrl: 'https://iomete.com/product/data-platform/data-warehousing',
    fitsWhen: [
      'Multiple departments sharing the same underlying data tables with strict SLA separation',
      'Eliminating "noisy neighbor" resource starvation between ad-hoc queries and production pipelines'
    ],
    doesNotFitWhen: [
      'Single-user analytics setup with no concurrency contention'
    ],
    commonObjections: 'Do multiple virtual clusters duplicate storage or increase idle cost?',
    safeHonestResponse: 'Virtual clusters share the exact same single copy of Iceberg storage and auto-suspend to zero pods after configurable idle timeouts.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_autoscale_suspend',
    name: 'Dynamic Executor Auto-Scaling & Scale-to-Zero',
    category: 'Compute & Engine',
    plainDescription: 'Automatically adds Spark executor pods during query spikes and scales clusters down to zero when idle.',
    docUrl: 'https://iomete.com/roadmap/spark-4-0-upgrade',
    fitsWhen: [
      'Bursty weekday morning dashboard traffic or nightly ETL windows',
      'Cloud deployments where idle EC2/GKE nodes can be reclaimed by Karpenter or Cluster Autoscaler'
    ],
    doesNotFitWhen: [
      'Fixed single-server setups with no elastic scaling need'
    ],
    commonObjections: 'How fast does scale-down happen after a query finishes?',
    safeHonestResponse: 'Administrators configure exact idle timeout thresholds (from 1 minute to 24 hours) per virtual cluster.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_streaming_ingestion',
    name: 'Spark Structured Streaming & Kafka Ingestion',
    category: 'Compute & Engine',
    plainDescription: 'Ingest real-time event streams from Apache Kafka, AWS Kinesis, or Pulsar directly into transactional Iceberg tables.',
    docUrl: 'https://iomete.com/product/data-platform/real-time-analytics',
    fitsWhen: [
      'Near-real-time fraud analytics, IoT telemetry, clickstream pipelines, or CDC replication',
      'Unifying streaming and historical batch tables in a single Iceberg format'
    ],
    doesNotFitWhen: [
      'Sub-millisecond complex event processing requiring dedicated stateful Flink/C++ engines',
      'Monthly manual CSV uploads'
    ],
    commonObjections: 'Does streaming into object storage create too many small files?',
    safeHonestResponse: 'IOMETE pairs micro-batch trigger intervals with automated background Iceberg compaction to keep file sizes optimal.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_external_federation',
    name: 'Federated JDBC & Object Storage Querying',
    category: 'Compute & Engine',
    plainDescription: 'Query external operational databases (PostgreSQL, MySQL, Oracle, SQL Server) alongside lakehouse tables in a single SQL statement.',
    docUrl: 'https://iomete.com/product/data-platform/data-ingestion',
    fitsWhen: [
      'Joining live operational reference tables in Postgres/Oracle with multi-terabyte historical logs in S3',
      'Incremental migration off legacy relational data warehouses'
    ],
    doesNotFitWhen: [
      'Expecting federated queries over slow WAN links to replace proper ETL for multi-terabyte joins'
    ],
    commonObjections: 'How does federated performance compare to native Trino/Starburst?',
    safeHonestResponse: 'IOMETE supports predicate pushdown for JDBC sources, though if pure cross-continent zero-copy federation is 100% of your workload, dedicated query virtualization tools may have broader legacy connectors.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_fine_grained_rbac',
    name: 'Fine-Grained RBAC, ABAC & Tag-Based Access Control',
    category: 'Security & Governance',
    plainDescription: 'Centrally manage access permissions at the catalog, database, table, column, and row level using roles or security tags.',
    docUrl: 'https://iomete.com/product/data-platform/data-governance',
    fitsWhen: [
      'Regulated banking, healthcare, defense, or multi-department enterprises',
      'Tagging columns as PII or CONFIDENTIAL once and enforcing access policies across hundreds of tables'
    ],
    doesNotFitWhen: [
      'Small internal sandbox where every developer has full admin rights'
    ],
    commonObjections: 'Can users bypass table permissions if they access raw S3 files directly?',
    safeHonestResponse: 'No - applications and users authenticate only to IOMETE compute endpoints, while raw S3 bucket credentials remain locked to the storage service account.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_column_row_masking',
    name: 'Dynamic Column Masking & Row-Level Security Filters',
    category: 'Security & Governance',
    plainDescription: 'Redact or hash sensitive columns (SSNs, SWIFT codes, emails) dynamically at query time and filter rows by user region or department.',
    docUrl: 'https://iomete.com/roadmap/resource-based-authorization-system',
    fitsWhen: [
      'GDPR, HIPAA, PCI-DSS, or BaFin compliance requiring analysts to query tables without seeing raw PII',
      'Multi-region sales or banking teams who may only see rows belonging to their branch'
    ],
    doesNotFitWhen: [
      'Publicly available open datasets with zero privacy restrictions'
    ],
    commonObjections: 'Do we have to create duplicate views for every role to mask columns?',
    safeHonestResponse: 'No. Dynamic masking rules attach directly to the base table or tag, transforming output values on the fly based on the querying user.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_enterprise_sso_scim',
    name: 'Enterprise SSO (SAML 2.0 / OIDC) & LDAP / Active Directory Sync',
    category: 'Security & Governance',
    plainDescription: 'Integrate with Okta, Microsoft Entra ID (Azure AD), Keycloak, or on-premise Active Directory for single sign-on and group sync.',
    docUrl: 'https://iomete.com/product/architecture/data-mesh',
    fitsWhen: [
      'Enterprise IT mandate for centralized identity governance and automated user offboarding',
      'On-premise banks using internal Active Directory / LDAP servers'
    ],
    doesNotFitWhen: [
      'Single-user local prototype'
    ],
    commonObjections: 'Does SSO work in air-gapped environments without cloud identity providers?',
    safeHonestResponse: 'Yes, IOMETE connects directly to self-hosted Keycloak, ADFS, or internal LDAP directories inside the air-gapped network.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_comprehensive_audit_trail',
    name: 'Immutable Query & Access Audit Logging',
    category: 'Security & Governance',
    plainDescription: 'Records every SQL query, table scan, permission change, and login event with user identity and timestamp for compliance audits.',
    docUrl: 'https://iomete.com/roadmap/live-integrations-with-governance-ecosystem',
    fitsWhen: [
      'SOC 2 Type II, ISO 27001, HIPAA, FINRA, or central bank regulatory examinations',
      'Security operations teams forwarding access logs to Splunk, Elastic, or Datadog SIEM'
    ],
    doesNotFitWhen: [
      'Throwaway test environments with no audit requirements'
    ],
    commonObjections: 'Are audit logs stored inside a vendor cloud where we cannot inspect them?',
    safeHonestResponse: 'No - because IOMETE runs in your environment, all audit logs stay inside your own storage and SIEM pipeline.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_data_catalog_discovery',
    name: 'Built-in Data Catalog, Schema Explorer & Tagging',
    category: 'Security & Governance',
    plainDescription: 'Browse schemas, inspect column types, view table snapshots, and attach business glossary tags and documentation in one UI.',
    docUrl: 'https://iomete.com/roadmap/data-lineage',
    fitsWhen: [
      'Growing data platforms where analysts struggle to find which table contains verified metrics',
      'Combining technical schema metadata with governance tags'
    ],
    doesNotFitWhen: [
      'Organizations seeking a standalone enterprise-wide data lineage tool covering 50 non-lakehouse SaaS apps (like Collibra or Alation)'
    ],
    commonObjections: 'Third-party aggregators claim IOMETE has thinner governance tooling than legacy suites - is that true?',
    safeHonestResponse: 'IOMETE provides strong built-in catalog, tagging, RBAC, and column/row masking for lakehouse tables. However, if you require automated cross-platform lineage across Salesforce, SAP, and Workday, you should pair IOMETE with OpenMetadata or Collibra.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_sql_editor_notebooks',
    name: 'Built-in Web SQL Worksheet & Visual Chart Builder',
    category: 'Developer & Workflows',
    plainDescription: 'Browser-based SQL IDE with schema autocomplete, query history, execution plan inspection, and instant chart visualizations.',
    docUrl: 'https://iomete.com/roadmap/sql-editor-copilot-ai-assistance',
    fitsWhen: [
      'Data analysts and engineers who want a Snowflake-like SQL worksheet experience on top of open Iceberg',
      'Quickly sharing saved SQL queries and visual charts across teams'
    ],
    doesNotFitWhen: [
      'Teams that exclusively use external BI tools and never write SQL'
    ],
    commonObjections: 'Can the built-in SQL editor replace enterprise Tableau or PowerBI?',
    safeHonestResponse: 'The SQL editor is great for ad-hoc exploration and quick charts, but for complex executive dashboards you should connect Tableau, PowerBI, or Superset.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_jupyter_notebooks',
    name: 'Integrated Jupyter Notebooks for PySpark & Data Science',
    category: 'Developer & Workflows',
    plainDescription: 'Launch pre-configured Jupyter notebooks attached directly to Spark clusters for Python, PySpark, and ML experimentation.',
    docUrl: 'https://iomete.com/roadmap/jupyter-containers',
    fitsWhen: [
      'Data scientists and ML engineers building feature pipelines or training models on lakehouse tables',
      'Interactive PySpark development without local environment setup headaches'
    ],
    doesNotFitWhen: [
      'SQL-only reporting teams with no Python or data science workflows'
    ],
    commonObjections: 'Can data scientists install custom Python libraries in air-gapped environments?',
    safeHonestResponse: 'Yes, custom Conda/pip wheels and custom Docker base images can be loaded from your internal mirror.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_serverless_spark_jobs',
    name: 'Scheduled Spark Jobs & Containerized Orchestration',
    category: 'Developer & Workflows',
    plainDescription: 'Package Python, PySpark, Scala, or Jar jobs as Docker images and run them on cron schedules or via REST API / Airflow triggers.',
    docUrl: 'https://iomete.com/roadmap/built-in-orchestration',
    fitsWhen: [
      'Running daily or hourly production ETL pipelines with isolated job compute pods',
      'Triggering Spark workloads from existing Apache Airflow, Dagster, or Prefect DAGs'
    ],
    doesNotFitWhen: [
      'Simple 5-line bash scripts that do not process analytical data'
    ],
    commonObjections: 'Does each scheduled job spin up its own isolated resources?',
    safeHonestResponse: 'Yes. Job clusters spin up dedicated Kubernetes executor pods for the run and terminate them immediately upon completion.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_dbt_adapter',
    name: 'Native dbt (Data Build Tool) Spark/Iceberg Integration',
    category: 'Developer & Workflows',
    plainDescription: 'First-class dbt-iomete / dbt-spark adapter allowing analytics engineers to build modular SQL transformation pipelines and tests.',
    docUrl: 'https://iomete.com/product/architecture/integrations-ecosystem',
    fitsWhen: [
      'Analytics engineering teams already using dbt Core or dbt Cloud on Snowflake/BigQuery',
      'Migrating existing SQL transformation models to Apache Iceberg with minimal SQL rewrites'
    ],
    doesNotFitWhen: [
      'Teams with zero SQL transformation workflows'
    ],
    commonObjections: 'How much SQL refactoring is required when moving dbt models from Snowflake to IOMETE?',
    safeHonestResponse: 'Standard ANSI SQL models port cleanly, though proprietary Snowflake functions (FLATTEN, custom macros) require conversion to Spark SQL equivalents.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_bi_connectors_jdbc',
    name: 'Universal BI Connectors (Tableau, PowerBI, Superset, Metabase)',
    category: 'Developer & Workflows',
    plainDescription: 'High-throughput JDBC/ODBC and Arrow-backed drivers for connecting enterprise business intelligence and reporting suites.',
    docUrl: 'https://iomete.com/product/data-platform/business-intelligence',
    fitsWhen: [
      'Executive and operational dashboards in Tableau, Microsoft PowerBI, Apache Superset, or Metabase',
      'Serving hundreds of concurrent business viewers from curated Iceberg gold tables'
    ],
    doesNotFitWhen: [
      'No BI or reporting layer needed'
    ],
    commonObjections: 'Do BI tools require special gateway bridges to reach on-premise IOMETE?',
    safeHonestResponse: 'In on-prem deployments, Tableau Server or Superset runs in the same network; for cloud BI, standard secure TLS JDBC endpoints are exposed.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_git_versioned_pipelines',
    name: 'Git-Integrated Spark Jobs & CI/CD REST APIs',
    category: 'Developer & Workflows',
    plainDescription: 'Deploy and update Spark job definitions, SQL scripts, and virtual cluster configs automatically via GitHub Actions or GitLab CI.',
    docUrl: 'https://iomete.com/product/data-platform/data-science',
    fitsWhen: [
      'Mature DataOps teams enforcing pull-request code reviews and automated staging-to-production promotion'
    ],
    doesNotFitWhen: [
      'Manual ad-hoc scripts with no version control'
    ],
    commonObjections: 'Does it support self-hosted GitLab Enterprise inside a private network?',
    safeHonestResponse: 'Yes, any Git repository or container registry reachable within your private network integrates via standard webhooks and tokens.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_zero_compute_markup',
    name: 'Transparent Cost Model (Zero Cloud Compute Markup)',
    category: 'Cost & Operations',
    plainDescription: 'You pay your cloud provider or hardware vendor directly for raw compute nodes - IOMETE does not add a 3x-5x per-credit compute markup.',
    docUrl: 'https://iomete.com/pricing',
    fitsWhen: [
      'Annual Snowflake credit or Databricks DBU bills exceeding $250K-$2M+ due to heavy compute markups',
      'Organizations with existing AWS Savings Plans, GCP Committed Use Discounts, or amortized bare-metal servers'
    ],
    doesNotFitWhen: [
      'Tiny startups spending <$500/month on analytics where platform licensing exceeds raw compute cost'
    ],
    commonObjections: 'Can you guarantee a specific percentage of TCO savings without seeing our workload?',
    safeHonestResponse: 'No - we never claim blanket ROI percentages without benchmarking your actual query profile, node utilization, and existing cloud discounts.',
    maturityNote: 'verified'
  },
  {
    id: 'cap_prebuilt_saas_connectors_unverified',
    name: '200+ Turnkey SaaS Ingestion Connectors (Unverified Claim Check)',
    category: 'Developer & Workflows',
    plainDescription: 'Third-party listings sometimes compare built-in SaaS ELT connectors (Salesforce, Workday, NetSuite). IOMETE focuses on core lakehouse compute/storage and pairs with Airbyte/Fivetran/Kafka for SaaS ingestion.',
    docUrl: 'https://iomete.com/roadmap/event-streaming-service',
    fitsWhen: [
      'Pairing IOMETE with Airbyte, Fivetran, Debezium, or Kafka for upstream SaaS ingestion'
    ],
    doesNotFitWhen: [
      'Expecting IOMETE alone to replace Fivetran/Airbyte for 200+ niche marketing SaaS APIs without an ingestion tool'
    ],
    commonObjections: 'Third-party aggregators note IOMETE has fewer pre-built SaaS connectors than bundled cloud suites.',
    safeHonestResponse: 'That is accurate and important to state honestly: IOMETE is the sovereign lakehouse storage and compute engine, not a SaaS API scraper. For CRM/ERP connectors, we integrate cleanly with Airbyte, Debezium, or Fivetran.',
    maturityNote: 'unverified'
  }
];
