"""
DuckDB Database Layer
=====================

Provides database connection and utilities for the analytics platform.
Uses DuckDB for fast analytical queries on the synthetic data.
"""

import duckdb
from pathlib import Path
from typing import Optional, List, Dict, Any
import pandas as pd
from contextlib import contextmanager

# Database file path
DB_PATH = Path(__file__).parent.parent / "saas_analytics.duckdb"


def get_connection(read_only: bool = False) -> duckdb.DuckDBPyConnection:
    """Get a DuckDB connection."""
    return duckdb.connect(str(DB_PATH), read_only=read_only)


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_database():
    """Initialize the database schema."""
    with get_db() as conn:
        # Drop existing tables if they exist
        tables = [
            'expansion_opportunities', 'nps_surveys', 'mrr_movements',
            'marketing_spend', 'usage_events', 'stage_transitions',
            'customers', 'opportunities', 'sales_reps', 'leads'
        ]
        for table in tables:
            conn.execute(f"DROP TABLE IF EXISTS {table}")

        # Create leads table
        conn.execute("""
            CREATE TABLE leads (
                lead_id VARCHAR PRIMARY KEY,
                created_date DATE NOT NULL,
                channel VARCHAR NOT NULL,
                company_name VARCHAR NOT NULL,
                company_size VARCHAR NOT NULL,
                industry VARCHAR NOT NULL,
                estimated_acv DOUBLE NOT NULL,
                assigned_rep_id VARCHAR
            )
        """)

        # Create sales_reps table
        conn.execute("""
            CREATE TABLE sales_reps (
                rep_id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                start_date DATE NOT NULL,
                segment_focus VARCHAR NOT NULL,
                performance_score DOUBLE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)

        # Create opportunities table
        conn.execute("""
            CREATE TABLE opportunities (
                opportunity_id VARCHAR PRIMARY KEY,
                lead_id VARCHAR NOT NULL,
                created_date DATE NOT NULL,
                current_stage VARCHAR NOT NULL,
                amount DOUBLE NOT NULL,
                close_date DATE,
                is_won BOOLEAN,
                loss_reason VARCHAR,
                assigned_rep_id VARCHAR NOT NULL,
                company_size VARCHAR NOT NULL,
                channel VARCHAR NOT NULL,
                industry VARCHAR NOT NULL,
                FOREIGN KEY (lead_id) REFERENCES leads(lead_id)
            )
        """)

        # Create stage_transitions table
        conn.execute("""
            CREATE TABLE stage_transitions (
                transition_id VARCHAR PRIMARY KEY,
                opportunity_id VARCHAR NOT NULL,
                from_stage VARCHAR NOT NULL,
                to_stage VARCHAR NOT NULL,
                transition_date TIMESTAMP NOT NULL,
                days_in_previous_stage INTEGER NOT NULL,
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id)
            )
        """)

        # Create customers table
        conn.execute("""
            CREATE TABLE customers (
                customer_id VARCHAR PRIMARY KEY,
                opportunity_id VARCHAR NOT NULL,
                company_name VARCHAR NOT NULL,
                company_size VARCHAR NOT NULL,
                industry VARCHAR NOT NULL,
                channel VARCHAR NOT NULL,
                start_date DATE NOT NULL,
                status VARCHAR NOT NULL,
                churn_date DATE,
                current_mrr DOUBLE NOT NULL,
                initial_mrr DOUBLE NOT NULL,
                assigned_rep_id VARCHAR NOT NULL,
                latest_nps_score INTEGER,
                health_score VARCHAR,
                churn_probability DOUBLE,
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id)
            )
        """)

        # Create usage_events table
        conn.execute("""
            CREATE TABLE usage_events (
                event_id VARCHAR PRIMARY KEY,
                customer_id VARCHAR NOT NULL,
                event_date DATE NOT NULL,
                logins INTEGER NOT NULL,
                api_calls INTEGER NOT NULL,
                reports_generated INTEGER NOT NULL,
                team_members_active INTEGER NOT NULL,
                integrations_used INTEGER NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
            )
        """)

        # Create marketing_spend table
        conn.execute("""
            CREATE TABLE marketing_spend (
                spend_id VARCHAR PRIMARY KEY,
                channel VARCHAR NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                amount DOUBLE NOT NULL,
                campaign_name VARCHAR
            )
        """)

        # Create mrr_movements table
        conn.execute("""
            CREATE TABLE mrr_movements (
                movement_id VARCHAR PRIMARY KEY,
                customer_id VARCHAR NOT NULL,
                movement_date DATE NOT NULL,
                movement_type VARCHAR NOT NULL,
                amount DOUBLE NOT NULL,
                previous_mrr DOUBLE NOT NULL,
                new_mrr DOUBLE NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
            )
        """)

        # Create nps_surveys table
        conn.execute("""
            CREATE TABLE nps_surveys (
                survey_id VARCHAR PRIMARY KEY,
                customer_id VARCHAR NOT NULL,
                survey_date DATE NOT NULL,
                score INTEGER,
                response_text VARCHAR,
                responded BOOLEAN NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
            )
        """)

        # Create expansion_opportunities table
        conn.execute("""
            CREATE TABLE expansion_opportunities (
                expansion_id VARCHAR PRIMARY KEY,
                customer_id VARCHAR NOT NULL,
                identified_date DATE NOT NULL,
                opportunity_type VARCHAR NOT NULL,
                estimated_value DOUBLE NOT NULL,
                status VARCHAR NOT NULL,
                closed_date DATE,
                actual_value DOUBLE,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
            )
        """)

        # Create indexes for common queries
        # Basic single-column indexes
        conn.execute("CREATE INDEX idx_leads_created ON leads(created_date)")
        conn.execute("CREATE INDEX idx_leads_channel ON leads(channel)")
        conn.execute("CREATE INDEX idx_opportunities_stage ON opportunities(current_stage)")
        conn.execute("CREATE INDEX idx_opportunities_close ON opportunities(close_date)")
        conn.execute("CREATE INDEX idx_customers_status ON customers(status)")
        conn.execute("CREATE INDEX idx_customers_start ON customers(start_date)")
        conn.execute("CREATE INDEX idx_usage_customer ON usage_events(customer_id)")
        conn.execute("CREATE INDEX idx_usage_date ON usage_events(event_date)")
        conn.execute("CREATE INDEX idx_mrr_customer ON mrr_movements(customer_id)")
        conn.execute("CREATE INDEX idx_mrr_date ON mrr_movements(movement_date)")

        # Additional indexes for common filter patterns
        conn.execute("CREATE INDEX idx_customers_health ON customers(health_score)")
        conn.execute("CREATE INDEX idx_customers_churn_prob ON customers(churn_probability)")
        conn.execute("CREATE INDEX idx_customers_company_size ON customers(company_size)")
        conn.execute("CREATE INDEX idx_customers_churn_date ON customers(churn_date)")
        conn.execute("CREATE INDEX idx_mrr_type ON mrr_movements(movement_type)")
        conn.execute("CREATE INDEX idx_opportunities_rep ON opportunities(assigned_rep_id)")
        conn.execute("CREATE INDEX idx_opportunities_created ON opportunities(created_date)")
        conn.execute("CREATE INDEX idx_stage_transitions_opp ON stage_transitions(opportunity_id)")
        conn.execute("CREATE INDEX idx_nps_customer ON nps_surveys(customer_id)")
        conn.execute("CREATE INDEX idx_expansion_customer ON expansion_opportunities(customer_id)")

        # Compound indexes for common multi-column filters
        conn.execute("CREATE INDEX idx_customers_status_health ON customers(status, health_score)")
        conn.execute("CREATE INDEX idx_customers_status_size ON customers(status, company_size)")
        conn.execute("CREATE INDEX idx_customers_status_churn ON customers(status, churn_probability)")
        conn.execute("CREATE INDEX idx_usage_customer_date ON usage_events(customer_id, event_date)")
        conn.execute("CREATE INDEX idx_mrr_customer_date ON mrr_movements(customer_id, movement_date)")
        conn.execute("CREATE INDEX idx_opportunities_stage_date ON opportunities(current_stage, created_date)")

        print("Database schema initialized successfully")


def load_dataframe(table_name: str, df: pd.DataFrame):
    """Load a pandas DataFrame into a table."""
    import tempfile
    import os

    # Convert any object columns that might be enums to strings
    df_copy = df.copy()
    for col in df_copy.columns:
        # Handle object dtype columns (including enums)
        if df_copy[col].dtype == 'object':
            # Convert each value explicitly to handle enums
            df_copy[col] = df_copy[col].apply(
                lambda x: x.value if hasattr(x, 'value') else (str(x) if pd.notna(x) else None)
            )

    # Write to temporary parquet file and load from there
    with tempfile.NamedTemporaryFile(suffix='.parquet', delete=False) as f:
        temp_path = f.name

    try:
        df_copy.to_parquet(temp_path, index=False)
        with get_db() as conn:
            conn.execute(f"INSERT INTO {table_name} SELECT * FROM read_parquet('{temp_path}')")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def query_to_df(query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """Execute a query and return results as DataFrame."""
    with get_db() as conn:
        if params:
            return conn.execute(query, params).fetchdf()
        return conn.execute(query).fetchdf()


def execute_query(query: str, params: Optional[Dict[str, Any]] = None) -> List[tuple]:
    """Execute a query and return raw results."""
    with get_db() as conn:
        if params:
            return conn.execute(query, params).fetchall()
        return conn.execute(query).fetchall()


def get_table_count(table_name: str) -> int:
    """Get row count for a table."""
    with get_db() as conn:
        result = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        return result[0] if result else 0


def table_exists(table_name: str) -> bool:
    """Check if a table exists."""
    with get_db() as conn:
        result = conn.execute(f"""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name = '{table_name}'
        """).fetchone()
        return result[0] > 0 if result else False


def get_database_stats() -> Dict[str, int]:
    """Get row counts for all tables."""
    tables = [
        'leads', 'sales_reps', 'opportunities', 'stage_transitions',
        'customers', 'usage_events', 'marketing_spend', 'mrr_movements',
        'nps_surveys', 'expansion_opportunities'
    ]
    stats = {}
    with get_db() as conn:
        for table in tables:
            try:
                result = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
                stats[table] = result[0] if result else 0
            except:
                stats[table] = 0
    return stats


# Common analytical queries

def get_funnel_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    channel: Optional[str] = None,
    company_size: Optional[str] = None
) -> pd.DataFrame:
    """Get funnel conversion data with optional filters."""
    query = """
        SELECT
            current_stage,
            COUNT(*) as count,
            SUM(amount) as total_value,
            AVG(amount) as avg_value
        FROM opportunities
        WHERE 1=1
    """
    if start_date:
        query += f" AND created_date >= '{start_date}'"
    if end_date:
        query += f" AND created_date <= '{end_date}'"
    if channel:
        query += f" AND channel = '{channel}'"
    if company_size:
        query += f" AND company_size = '{company_size}'"

    query += " GROUP BY current_stage ORDER BY current_stage"
    return query_to_df(query)


def get_customer_health_data() -> pd.DataFrame:
    """Get customer health metrics."""
    query = """
        SELECT
            c.customer_id,
            c.company_name,
            c.company_size,
            c.industry,
            c.current_mrr,
            c.status,
            c.start_date,
            c.churn_date,
            c.health_score,
            c.churn_probability,
            c.latest_nps_score,
            DATEDIFF('day', c.start_date, CURRENT_DATE) as tenure_days,
            (
                SELECT MAX(event_date)
                FROM usage_events u
                WHERE u.customer_id = c.customer_id
            ) as last_usage_date
        FROM customers c
        WHERE c.status = 'Active'
        ORDER BY c.churn_probability DESC NULLS LAST
    """
    return query_to_df(query)


def get_mrr_movements_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> pd.DataFrame:
    """Get MRR movements summary."""
    query = """
        SELECT
            movement_type,
            COUNT(*) as movement_count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount
        FROM mrr_movements
        WHERE 1=1
    """
    if start_date:
        query += f" AND movement_date >= '{start_date}'"
    if end_date:
        query += f" AND movement_date <= '{end_date}'"

    query += " GROUP BY movement_type ORDER BY movement_type"
    return query_to_df(query)


def get_rep_performance() -> pd.DataFrame:
    """Get sales rep performance metrics."""
    query = """
        SELECT
            r.rep_id,
            r.name,
            r.segment_focus,
            r.performance_score,
            COUNT(CASE WHEN o.is_won = true THEN 1 END) as deals_won,
            COUNT(CASE WHEN o.is_won = false THEN 1 END) as deals_lost,
            COUNT(o.opportunity_id) as total_opportunities,
            SUM(CASE WHEN o.is_won = true THEN o.amount ELSE 0 END) as total_revenue,
            AVG(CASE WHEN o.is_won = true THEN o.amount END) as avg_deal_size
        FROM sales_reps r
        LEFT JOIN opportunities o ON r.rep_id = o.assigned_rep_id
        GROUP BY r.rep_id, r.name, r.segment_focus, r.performance_score
        ORDER BY total_revenue DESC
    """
    return query_to_df(query)


if __name__ == "__main__":
    # Initialize database when run directly
    init_database()
    print("\nDatabase stats:")
    for table, count in get_database_stats().items():
        print(f"  {table}: {count} rows")
