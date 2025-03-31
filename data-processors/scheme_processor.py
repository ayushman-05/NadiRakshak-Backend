import pandas as pd
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def process_schemes(csv_path):
    """Process government schemes CSV"""
    try:
        df = pd.read_csv(csv_path)
        
        # Clean data
        df = df[['Scheme Name', 'Project Details', 'Status', 'Start Date', 'Budget']]
        df['Start Date'] = pd.to_datetime(df['Start Date'])
        df['Last Updated'] = datetime.now()
        
        # Connect to MongoDB
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client.river_db
        collection = db.gov_schemes
        
        # Convert to records
        records = df.to_dict('records')
        
        # Bulk write with update
        bulk_ops = [{
            'update_one': {
                'filter': {'Scheme Name': rec['Scheme Name']},
                'update': {'$set': rec},
                'upsert': True
            }
        } for rec in records]
        
        collection.bulk_write(bulk_ops)
        logger.info(f"Processed {len(records)} scheme records")
        return True
        
    except Exception as e:
        logger.error(f"Scheme processing failed: {str(e)}")
        return False

if __name__ == "__main__":
    csv_path = os.getenv("SCHEMES_CSV_PATH")
    if process_schemes(csv_path):
        print("Scheme processing completed")
    else:
        print("Scheme processing failed")
