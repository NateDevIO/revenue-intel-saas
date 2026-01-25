"""
Synthetic Data Generator
========================

Generates realistic B2B SaaS data for the Revenue Lifecycle Analyzer.
Creates interconnected data across all 10 entities with realistic patterns:
- Seasonality in lead generation
- Segment-based conversion variations
- Usage-churn correlation
- Rep performance variation

Run this module directly to generate fresh data:
    python -m backend.data.generator
"""

import uuid
import random
from datetime import date, datetime, timedelta
from typing import List, Dict, Tuple, Optional
import pandas as pd
import numpy as np
from faker import Faker

from .assumptions import (
    DEFAULT_ASSUMPTIONS, DATA_START_DATE, DATA_END_DATE,
    AllAssumptions, CompanySize, LeadChannel, Industry,
    OpportunityStage, CustomerStatus, MRRMovementType
)
from .database import init_database, load_dataframe, get_db

fake = Faker()
Faker.seed(42)
random.seed(42)
np.random.seed(42)


class SyntheticDataGenerator:
    """Generates realistic synthetic SaaS data."""

    def __init__(self, assumptions: AllAssumptions = DEFAULT_ASSUMPTIONS):
        self.assumptions = assumptions
        self.leads: List[Dict] = []
        self.sales_reps: List[Dict] = []
        self.opportunities: List[Dict] = []
        self.stage_transitions: List[Dict] = []
        self.customers: List[Dict] = []
        self.usage_events: List[Dict] = []
        self.marketing_spend: List[Dict] = []
        self.mrr_movements: List[Dict] = []
        self.nps_surveys: List[Dict] = []
        self.expansion_opportunities: List[Dict] = []

        # Lookup maps
        self.lead_to_opp: Dict[str, str] = {}
        self.opp_to_customer: Dict[str, str] = {}
        self.customer_data: Dict[str, Dict] = {}

    def generate_all(self):
        """Generate all synthetic data."""
        print("Generating synthetic data...")

        print("  1/10 Generating sales reps...")
        self._generate_sales_reps()

        print("  2/10 Generating leads...")
        self._generate_leads()

        print("  3/10 Generating opportunities and stage transitions...")
        self._generate_opportunities()

        print("  4/10 Generating customers...")
        self._generate_customers()

        print("  5/10 Generating usage events...")
        self._generate_usage_events()

        print("  6/10 Generating marketing spend...")
        self._generate_marketing_spend()

        print("  7/10 Generating MRR movements...")
        self._generate_mrr_movements()

        print("  8/10 Generating NPS surveys...")
        self._generate_nps_surveys()

        print("  9/10 Generating expansion opportunities...")
        self._generate_expansion_opportunities()

        print("  10/10 Updating customer health scores...")
        self._update_customer_health_scores()

        print("Data generation complete!")
        self._print_summary()

    def _generate_sales_reps(self):
        """Generate sales rep data."""
        a = self.assumptions.sales_rep
        segments = ['SMB', 'Mid-Market', 'Enterprise']

        for i in range(a.num_reps):
            # Generate performance score with normal distribution
            perf = np.random.normal(1.0, a.performance_std_dev)
            perf = max(a.min_performance, min(a.max_performance, perf))

            self.sales_reps.append({
                'rep_id': f'REP_{i+1:03d}',
                'name': fake.name(),
                'start_date': DATA_START_DATE - timedelta(days=random.randint(30, 365)),
                'segment_focus': a.rep_segment_focus[i] if i < len(a.rep_segment_focus) else random.choice(segments),
                'performance_score': round(perf, 3),
                'is_active': True
            })

    def _generate_leads(self):
        """Generate lead data with seasonality."""
        a = self.assumptions.lead_gen

        current_date = DATA_START_DATE
        while current_date <= DATA_END_DATE:
            # Apply seasonality
            month = current_date.month
            seasonality_mult = a.seasonality.get(month, 1.0)
            monthly_leads = int(a.base_leads_per_month * seasonality_mult)

            # Add some random variation
            monthly_leads = int(monthly_leads * np.random.uniform(0.9, 1.1))

            # Distribute leads throughout the month
            days_in_month = 28 if current_date.month == 2 else 30 if current_date.month in [4, 6, 9, 11] else 31
            leads_per_day = monthly_leads / days_in_month

            for day in range(days_in_month):
                lead_date = current_date + timedelta(days=day)
                if lead_date > DATA_END_DATE:
                    break

                # Generate leads for this day
                daily_leads = int(leads_per_day * np.random.uniform(0.7, 1.3))
                for _ in range(daily_leads):
                    lead = self._create_lead(lead_date)
                    self.leads.append(lead)

            # Move to next month
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)

    def _create_lead(self, lead_date: date) -> Dict:
        """Create a single lead."""
        a = self.assumptions

        # Select channel
        channel = np.random.choice(
            list(a.lead_gen.channel_distribution.keys()),
            p=list(a.lead_gen.channel_distribution.values())
        )

        # Select company size
        company_size = np.random.choice(
            list(a.lead_gen.company_size_distribution.keys()),
            p=list(a.lead_gen.company_size_distribution.values())
        )

        # Select industry
        industry = np.random.choice(
            list(a.lead_gen.industry_distribution.keys()),
            p=list(a.lead_gen.industry_distribution.values())
        )

        # Generate ACV based on segment
        acv_params = a.deal_value.acv_by_segment[company_size]
        estimated_acv = np.random.triangular(
            acv_params['min'],
            acv_params['median'],
            acv_params['max']
        )

        # Assign rep based on segment
        matching_reps = [r for r in self.sales_reps if r['segment_focus'] == company_size]
        rep = random.choice(matching_reps) if matching_reps else random.choice(self.sales_reps)

        lead_id = f'LEAD_{uuid.uuid4().hex[:8].upper()}'

        return {
            'lead_id': lead_id,
            'created_date': lead_date,
            'channel': channel,
            'company_name': fake.company(),
            'company_size': company_size,
            'industry': industry,
            'estimated_acv': round(estimated_acv, 2),
            'assigned_rep_id': rep['rep_id']
        }

    def _generate_opportunities(self):
        """Generate opportunities with stage transitions."""
        a = self.assumptions

        for lead in self.leads:
            # Start all leads as opportunities at Lead stage
            opp_id = f'OPP_{uuid.uuid4().hex[:8].upper()}'
            self.lead_to_opp[lead['lead_id']] = opp_id

            # Get conversion multipliers
            segment_mult = a.conversion.segment_multipliers.get(lead['company_size'], {})
            channel_mult = a.conversion.channel_quality.get(lead['channel'], 1.0)

            # Get rep performance
            rep = next((r for r in self.sales_reps if r['rep_id'] == lead['assigned_rep_id']), None)
            rep_mult = rep['performance_score'] if rep else 1.0

            # Simulate progression through stages
            stages = ['Lead', 'MQL', 'SQL', 'Opportunity', 'Negotiation', 'Closed Won']
            stage_keys = ['lead_to_mql', 'mql_to_sql', 'sql_to_opportunity',
                         'opportunity_to_negotiation', 'negotiation_to_closed']

            current_stage = 'Lead'
            current_date = datetime.combine(lead['created_date'], datetime.min.time())
            transitions = []
            is_won = None
            loss_reason = None
            close_date = None

            for i, (stage, stage_key) in enumerate(zip(stages[1:], stage_keys)):
                # Calculate conversion probability
                base_conv = a.conversion.base_stage_conversion[stage_key]
                seg_mult = segment_mult.get(stage_key, 1.0)
                final_conv = min(0.95, base_conv * seg_mult * channel_mult * rep_mult)

                if random.random() < final_conv:
                    # Convert to next stage
                    prev_stage = current_stage
                    current_stage = stage

                    # Calculate time to advance
                    base_days = a.velocity.median_stage_days[stage_key]
                    velocity_mult = a.velocity.segment_velocity_multipliers.get(lead['company_size'], 1.0)
                    days_in_stage = max(1, int(np.random.exponential(base_days * velocity_mult * a.velocity.cv)))

                    transition_date = current_date + timedelta(days=days_in_stage)
                    if transition_date.date() > DATA_END_DATE:
                        break

                    transitions.append({
                        'transition_id': f'TRANS_{uuid.uuid4().hex[:8].upper()}',
                        'opportunity_id': opp_id,
                        'from_stage': prev_stage,
                        'to_stage': stage,
                        'transition_date': transition_date,
                        'days_in_previous_stage': days_in_stage
                    })

                    current_date = transition_date

                    if stage == 'Closed Won':
                        is_won = True
                        close_date = current_date.date()
                else:
                    # Lost at this stage
                    if current_stage != 'Lead':  # Only mark as lost if made it past lead
                        is_won = False
                        close_date = current_date.date() + timedelta(days=random.randint(1, 14))
                        if close_date > DATA_END_DATE:
                            close_date = DATA_END_DATE

                        # Assign loss reason
                        stage_loss_reasons = a.conversion.loss_reasons.get(
                            current_stage.lower().replace(' ', '_'),
                            a.conversion.loss_reasons.get('opportunity', {'Other': 1.0})
                        )
                        loss_reason = np.random.choice(
                            list(stage_loss_reasons.keys()),
                            p=list(stage_loss_reasons.values())
                        )

                        # Create lost transition
                        transitions.append({
                            'transition_id': f'TRANS_{uuid.uuid4().hex[:8].upper()}',
                            'opportunity_id': opp_id,
                            'from_stage': current_stage,
                            'to_stage': 'Closed Lost',
                            'transition_date': datetime.combine(close_date, datetime.min.time()),
                            'days_in_previous_stage': (close_date - current_date.date()).days
                        })
                        current_stage = 'Closed Lost'
                    break

            # Create opportunity record
            self.opportunities.append({
                'opportunity_id': opp_id,
                'lead_id': lead['lead_id'],
                'created_date': lead['created_date'],
                'current_stage': current_stage,
                'amount': lead['estimated_acv'],
                'close_date': close_date,
                'is_won': is_won,
                'loss_reason': loss_reason,
                'assigned_rep_id': lead['assigned_rep_id'],
                'company_size': lead['company_size'],
                'channel': lead['channel'],
                'industry': lead['industry']
            })

            self.stage_transitions.extend(transitions)

    def _generate_customers(self):
        """Generate customer records from won opportunities."""
        a = self.assumptions

        for opp in self.opportunities:
            if opp['is_won']:
                customer_id = f'CUST_{uuid.uuid4().hex[:8].upper()}'
                self.opp_to_customer[opp['opportunity_id']] = customer_id

                start_date = opp['close_date']
                initial_mrr = opp['amount'] / 12  # Convert ACV to MRR

                # Determine if customer has churned
                status = 'Active'
                churn_date = None

                # Calculate churn probability based on tenure and segment
                base_churn = a.retention.base_monthly_churn
                segment_mult = a.retention.segment_churn_multipliers.get(opp['company_size'], 1.0)
                monthly_churn_prob = base_churn * segment_mult

                # Simulate each month
                current_mrr = initial_mrr
                current_date = start_date

                while current_date < DATA_END_DATE:
                    # Check for churn (will be refined with usage data later)
                    if random.random() < monthly_churn_prob:
                        status = 'Churned'
                        churn_date = current_date + timedelta(days=random.randint(1, 28))
                        if churn_date > DATA_END_DATE:
                            churn_date = DATA_END_DATE
                        current_mrr = 0
                        break

                    current_date = current_date + timedelta(days=30)

                # Find company name from lead
                lead = next((l for l in self.leads if l['lead_id'] == opp['lead_id']), None)
                company_name = lead['company_name'] if lead else fake.company()

                customer = {
                    'customer_id': customer_id,
                    'opportunity_id': opp['opportunity_id'],
                    'company_name': company_name,
                    'company_size': opp['company_size'],
                    'industry': opp['industry'],
                    'channel': opp['channel'],
                    'start_date': start_date,
                    'status': status,
                    'churn_date': churn_date,
                    'current_mrr': round(current_mrr, 2) if status == 'Active' else 0,
                    'initial_mrr': round(initial_mrr, 2),
                    'assigned_rep_id': opp['assigned_rep_id'],
                    'latest_nps_score': None,
                    'health_score': None,
                    'churn_probability': None
                }

                self.customers.append(customer)
                self.customer_data[customer_id] = customer

    def _generate_usage_events(self):
        """Generate daily usage events for each customer."""
        a = self.assumptions.usage

        for customer in self.customers:
            start = customer['start_date']
            end = customer['churn_date'] if customer['churn_date'] else DATA_END_DATE
            segment = customer['company_size']
            base_usage = a.base_usage_by_segment.get(segment, a.base_usage_by_segment['SMB'])

            # Track if customer is declining (pre-churn)
            is_churning = customer['status'] == 'Churned'
            days_until_churn = (customer['churn_date'] - start).days if is_churning else None

            current_date = start
            usage_multiplier = 1.0

            while current_date <= end:
                # Apply decline for churning customers
                if is_churning and days_until_churn:
                    days_from_start = (current_date - start).days
                    days_remaining = days_until_churn - days_from_start

                    if days_remaining < a.decline_start_days:
                        # Linear decline
                        decline_progress = 1 - (days_remaining / a.decline_start_days)
                        usage_multiplier = 1 - (decline_progress * (1 - a.decline_final_percentage))

                # Generate daily usage with some randomness
                event = {
                    'event_id': f'USE_{uuid.uuid4().hex.upper()}',
                    'customer_id': customer['customer_id'],
                    'event_date': current_date,
                    'logins': max(0, int(base_usage['logins'] * usage_multiplier * np.random.uniform(0.5, 1.5))),
                    'api_calls': max(0, int(base_usage['api_calls'] * usage_multiplier * np.random.uniform(0.5, 1.5))),
                    'reports_generated': max(0, int(base_usage['reports_generated'] * usage_multiplier * np.random.uniform(0.3, 1.7))),
                    'team_members_active': max(1, int(base_usage['team_members_active'] * usage_multiplier * np.random.uniform(0.7, 1.3))),
                    'integrations_used': max(0, int(base_usage['integrations_used'] * usage_multiplier * np.random.uniform(0.8, 1.2)))
                }

                # Weekend reduction
                if current_date.weekday() >= 5:
                    for key in ['logins', 'api_calls', 'reports_generated', 'team_members_active']:
                        event[key] = int(event[key] * 0.3)

                self.usage_events.append(event)
                current_date += timedelta(days=1)

    def _generate_marketing_spend(self):
        """Generate monthly marketing spend by channel."""
        a = self.assumptions.marketing

        current_date = DATA_START_DATE
        while current_date <= DATA_END_DATE:
            # Calculate month end
            if current_date.month == 12:
                month_end = date(current_date.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(current_date.year, current_date.month + 1, 1) - timedelta(days=1)

            if month_end > DATA_END_DATE:
                month_end = DATA_END_DATE

            for channel, base_spend in a.monthly_spend_by_channel.items():
                # Add variation
                actual_spend = base_spend * np.random.uniform(1 - a.spend_cv, 1 + a.spend_cv)

                self.marketing_spend.append({
                    'spend_id': f'SPEND_{uuid.uuid4().hex[:8].upper()}',
                    'channel': channel,
                    'period_start': current_date,
                    'period_end': month_end,
                    'amount': round(actual_spend, 2),
                    'campaign_name': f"{channel} - {current_date.strftime('%B %Y')}"
                })

            # Move to next month
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)

    def _generate_mrr_movements(self):
        """Generate MRR movement records."""
        a = self.assumptions.expansion

        for customer in self.customers:
            current_mrr = customer['initial_mrr']
            customer_id = customer['customer_id']

            # New customer movement
            self.mrr_movements.append({
                'movement_id': f'MRR_{uuid.uuid4().hex[:8].upper()}',
                'customer_id': customer_id,
                'movement_date': customer['start_date'],
                'movement_type': 'New',
                'amount': round(current_mrr, 2),
                'previous_mrr': 0,
                'new_mrr': round(current_mrr, 2)
            })

            # Simulate monthly expansion/contraction
            start = customer['start_date']
            end = customer['churn_date'] if customer['churn_date'] else DATA_END_DATE

            current_date = start + timedelta(days=30)
            while current_date <= end:
                previous_mrr = current_mrr

                # Check for expansion
                if random.random() < a.monthly_expansion_probability:
                    expansion_pct = np.random.triangular(
                        a.expansion_percentage_range['min'],
                        a.expansion_percentage_range['median'],
                        a.expansion_percentage_range['max']
                    )
                    expansion_amount = current_mrr * expansion_pct
                    current_mrr += expansion_amount

                    self.mrr_movements.append({
                        'movement_id': f'MRR_{uuid.uuid4().hex[:8].upper()}',
                        'customer_id': customer_id,
                        'movement_date': current_date,
                        'movement_type': 'Expansion',
                        'amount': round(expansion_amount, 2),
                        'previous_mrr': round(previous_mrr, 2),
                        'new_mrr': round(current_mrr, 2)
                    })

                # Check for contraction
                elif random.random() < a.monthly_contraction_probability:
                    contraction_pct = np.random.triangular(
                        a.contraction_percentage_range['min'],
                        a.contraction_percentage_range['median'],
                        a.contraction_percentage_range['max']
                    )
                    contraction_amount = current_mrr * contraction_pct
                    current_mrr -= contraction_amount

                    self.mrr_movements.append({
                        'movement_id': f'MRR_{uuid.uuid4().hex[:8].upper()}',
                        'customer_id': customer_id,
                        'movement_date': current_date,
                        'movement_type': 'Contraction',
                        'amount': round(-contraction_amount, 2),
                        'previous_mrr': round(previous_mrr, 2),
                        'new_mrr': round(current_mrr, 2)
                    })

                current_date += timedelta(days=30)

            # Churn movement if applicable
            if customer['status'] == 'Churned' and customer['churn_date']:
                self.mrr_movements.append({
                    'movement_id': f'MRR_{uuid.uuid4().hex[:8].upper()}',
                    'customer_id': customer_id,
                    'movement_date': customer['churn_date'],
                    'movement_type': 'Churn',
                    'amount': round(-current_mrr, 2),
                    'previous_mrr': round(current_mrr, 2),
                    'new_mrr': 0
                })
            else:
                # Update customer's current MRR
                customer['current_mrr'] = round(current_mrr, 2)

    def _generate_nps_surveys(self):
        """Generate NPS survey responses."""
        a = self.assumptions.nps

        for customer in self.customers:
            customer_id = customer['customer_id']
            start = customer['start_date']
            end = customer['churn_date'] if customer['churn_date'] else DATA_END_DATE
            is_churning = customer['status'] == 'Churned'

            # Survey every 90 days
            survey_date = start + timedelta(days=a.survey_frequency_days)

            while survey_date <= end:
                # Determine customer health for this survey
                if is_churning and customer['churn_date']:
                    days_to_churn = (customer['churn_date'] - survey_date).days
                    if days_to_churn < 30:
                        health = 'churning'
                    elif days_to_churn < 90:
                        health = 'at_risk'
                    else:
                        health = 'healthy'
                else:
                    health = 'healthy'

                responded = random.random() < a.response_rate
                score = None
                response_text = None

                if responded:
                    # Determine NPS category based on health
                    dist = a.score_distribution_by_health[health]
                    category = np.random.choice(
                        ['promoter', 'passive', 'detractor'],
                        p=dist
                    )

                    if category == 'promoter':
                        score = random.choice([9, 10])
                        response_text = random.choice([
                            "Great product, very helpful for our team!",
                            "Love the features, would recommend.",
                            "Excellent support and product quality.",
                            None
                        ])
                    elif category == 'passive':
                        score = random.choice([7, 8])
                        response_text = random.choice([
                            "Good product but room for improvement.",
                            "Works well for basic needs.",
                            None
                        ])
                    else:  # detractor
                        score = random.randint(0, 6)
                        response_text = random.choice([
                            "Too expensive for what we get.",
                            "Missing key features we need.",
                            "Support response times are slow.",
                            "Difficult to use, needs better UX.",
                            None
                        ])

                self.nps_surveys.append({
                    'survey_id': f'NPS_{uuid.uuid4().hex[:8].upper()}',
                    'customer_id': customer_id,
                    'survey_date': survey_date,
                    'score': score,
                    'response_text': response_text,
                    'responded': responded
                })

                # Update customer's latest NPS if responded
                if responded and score is not None:
                    customer['latest_nps_score'] = score

                survey_date += timedelta(days=a.survey_frequency_days)

    def _generate_expansion_opportunities(self):
        """Generate expansion/upsell opportunities."""
        a = self.assumptions.expansion

        for customer in self.customers:
            if customer['status'] != 'Active':
                continue

            customer_id = customer['customer_id']
            current_mrr = customer['current_mrr']
            start = customer['start_date']

            # Check for expansion opportunities every 30 days
            check_date = start + timedelta(days=90)  # Start checking after 90 days

            while check_date <= DATA_END_DATE:
                if random.random() < a.monthly_expansion_probability:
                    # Create expansion opportunity
                    estimated_value = current_mrr * np.random.triangular(
                        a.expansion_percentage_range['min'] * 12,
                        a.expansion_percentage_range['median'] * 12,
                        a.expansion_percentage_range['max'] * 12
                    )

                    # Determine status based on time
                    days_since_identified = (DATA_END_DATE - check_date).days

                    if days_since_identified < 30:
                        status = 'Identified'
                        closed_date = None
                        actual_value = None
                    elif days_since_identified < 60:
                        status = 'In Progress'
                        closed_date = None
                        actual_value = None
                    else:
                        # Resolve the opportunity
                        if random.random() < a.expansion_conversion_rate:
                            status = 'Won'
                            actual_value = estimated_value * np.random.uniform(0.8, 1.2)
                        else:
                            status = 'Lost'
                            actual_value = None
                        closed_date = check_date + timedelta(days=random.randint(30, 90))
                        if closed_date > DATA_END_DATE:
                            closed_date = DATA_END_DATE

                    self.expansion_opportunities.append({
                        'expansion_id': f'EXP_{uuid.uuid4().hex[:8].upper()}',
                        'customer_id': customer_id,
                        'identified_date': check_date,
                        'opportunity_type': random.choice(['Upsell', 'Cross-sell']),
                        'estimated_value': round(estimated_value, 2),
                        'status': status,
                        'closed_date': closed_date,
                        'actual_value': round(actual_value, 2) if actual_value else None
                    })

                check_date += timedelta(days=30)

    def _update_customer_health_scores(self):
        """Calculate health scores for active customers."""
        for customer in self.customers:
            if customer['status'] != 'Active':
                customer['health_score'] = None
                customer['churn_probability'] = None
                continue

            customer_id = customer['customer_id']

            # Get recent usage
            customer_usage = [u for u in self.usage_events
                           if u['customer_id'] == customer_id]

            if not customer_usage:
                customer['health_score'] = 'Yellow'
                customer['churn_probability'] = 0.5
                continue

            # Sort by date and get last 30 days
            customer_usage.sort(key=lambda x: x['event_date'], reverse=True)
            recent_usage = customer_usage[:30]

            # Calculate usage score (0-100)
            avg_logins = np.mean([u['logins'] for u in recent_usage])
            avg_api_calls = np.mean([u['api_calls'] for u in recent_usage])

            # Normalize based on segment
            segment = customer['company_size']
            base = self.assumptions.usage.base_usage_by_segment.get(segment, {})
            expected_logins = base.get('logins', 5)
            expected_api = base.get('api_calls', 100)

            login_score = min(100, (avg_logins / expected_logins) * 50)
            api_score = min(100, (avg_api_calls / expected_api) * 50)
            usage_score = (login_score + api_score) / 2

            # Get NPS score
            nps = customer.get('latest_nps_score')
            nps_score = 0
            if nps is not None:
                if nps >= 9:
                    nps_score = 100
                elif nps >= 7:
                    nps_score = 60
                else:
                    nps_score = 20

            # Calculate tenure factor (longer tenure = more stable)
            tenure_days = (DATA_END_DATE - customer['start_date']).days
            tenure_score = min(100, tenure_days / 3)  # Max score at 300 days

            # Composite health score
            # Usage: 40%, NPS: 30%, Tenure: 30%
            health_value = usage_score * 0.4 + nps_score * 0.3 + tenure_score * 0.3

            # Determine health category
            if health_value >= 70:
                health_score = 'Green'
                churn_prob = np.random.uniform(0.05, 0.15)
            elif health_value >= 40:
                health_score = 'Yellow'
                churn_prob = np.random.uniform(0.25, 0.45)
            else:
                health_score = 'Red'
                churn_prob = np.random.uniform(0.55, 0.85)

            customer['health_score'] = health_score
            customer['churn_probability'] = round(churn_prob, 3)

    def _print_summary(self):
        """Print data generation summary."""
        print("\n" + "=" * 50)
        print("DATA GENERATION SUMMARY")
        print("=" * 50)
        print(f"  Leads:                  {len(self.leads):,}")
        print(f"  Sales Reps:             {len(self.sales_reps):,}")
        print(f"  Opportunities:          {len(self.opportunities):,}")
        print(f"  Stage Transitions:      {len(self.stage_transitions):,}")
        print(f"  Customers:              {len(self.customers):,}")
        print(f"  Usage Events:           {len(self.usage_events):,}")
        print(f"  Marketing Spend:        {len(self.marketing_spend):,}")
        print(f"  MRR Movements:          {len(self.mrr_movements):,}")
        print(f"  NPS Surveys:            {len(self.nps_surveys):,}")
        print(f"  Expansion Opps:         {len(self.expansion_opportunities):,}")
        print("=" * 50)

        # Additional stats
        won_deals = sum(1 for o in self.opportunities if o['is_won'])
        total_closed = sum(1 for o in self.opportunities if o['is_won'] is not None)
        win_rate = won_deals / total_closed if total_closed > 0 else 0

        active_customers = sum(1 for c in self.customers if c['status'] == 'Active')
        churned_customers = sum(1 for c in self.customers if c['status'] == 'Churned')

        total_mrr = sum(c['current_mrr'] for c in self.customers if c['status'] == 'Active')

        print(f"\n  Win Rate:               {win_rate:.1%}")
        print(f"  Active Customers:       {active_customers:,}")
        print(f"  Churned Customers:      {churned_customers:,}")
        print(f"  Current MRR:            ${total_mrr:,.0f}")
        print(f"  Current ARR:            ${total_mrr * 12:,.0f}")
        print("=" * 50)

    def save_to_database(self):
        """Save all generated data to the database."""
        print("\nSaving data to database...")

        # Initialize fresh database
        init_database()

        # Convert to DataFrames and load
        tables = [
            ('leads', self.leads),
            ('sales_reps', self.sales_reps),
            ('opportunities', self.opportunities),
            ('stage_transitions', self.stage_transitions),
            ('customers', self.customers),
            ('usage_events', self.usage_events),
            ('marketing_spend', self.marketing_spend),
            ('mrr_movements', self.mrr_movements),
            ('nps_surveys', self.nps_surveys),
            ('expansion_opportunities', self.expansion_opportunities),
        ]

        for table_name, data in tables:
            if data:
                df = pd.DataFrame(data)
                load_dataframe(table_name, df)
                print(f"  Loaded {len(data):,} rows into {table_name}")

        print("Database save complete!")


def generate_and_save():
    """Generate synthetic data and save to database."""
    generator = SyntheticDataGenerator()
    generator.generate_all()
    generator.save_to_database()
    return generator


if __name__ == "__main__":
    generate_and_save()
