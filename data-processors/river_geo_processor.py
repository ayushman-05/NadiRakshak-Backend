import geopandas as gpd
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def process_river_geography(shapefile_path):
    """Process river shapefiles into MongoDB"""
    try:
        # Load shapefile
        gdf = gpd.read_file(shapefile_path)
        
        # Clean and transform
        gdf = gdf[['geometry', 'name', 'length_km', 'basin']]
        gdf['length_km'] = gdf['length_km'].astype(float)
        gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.001)  # Simplify for web
        
        # Connect to MongoDB
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client.river_db
        collection = db.river_geography
        
        # Geospatial indexing
        collection.create_index([("geometry", "2dsphere")])
        
        # Upsert data
        records = gdf.to_dict('records')
        for record in records:
            collection.update_one(
                {"name": record['name']},
                {"$set": record},
                upsert=True
            )
            
        logger.info(f"Processed {len(records)} river geography records")
        return True
        
    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        return False

if __name__ == "__main__":
    shapefile_path = os.getenv("SHAPEFILE_PATH")
    if process_river_geography(shapefile_path):
        print("River geography processing completed successfully")
    else:
        print("Processing failed - check logs")
