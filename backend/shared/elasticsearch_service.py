from elasticsearch import Elasticsearch, NotFoundError
from typing import List, Dict, Any, Optional
from shared.config import settings
import json
import logging

logger = logging.getLogger(__name__)

class ElasticsearchService:
    def __init__(self):
        self.client = Elasticsearch(
            [settings.ELASTICSEARCH_URL],
            verify_certs=False,
            ssl_show_warn=False
        )
        self.index_name = "emails"
    
    async def create_index(self):
        """Create the emails index with proper mapping"""
        try:
            # Check if index exists using the correct API
            if not self.client.indices.exists(index=self.index_name):
                mapping = {
                    "mappings": {
                        "properties": {
                            "id": {"type": "keyword"},
                            "user_id": {"type": "keyword"},
                            "subject": {
                                "type": "text",
                                "analyzer": "standard",
                                "search_analyzer": "standard"
                            },
                            "body": {
                                "type": "text",
                                "analyzer": "standard",
                                "search_analyzer": "standard"
                            },
                            "html_body": {
                                "type": "text",
                                "analyzer": "standard",
                                "search_analyzer": "standard"
                            },
                            "from_address": {
                                "properties": {
                                    "name": {"type": "text"},
                                    "email": {"type": "keyword"}
                                }
                            },
                            "to_addresses": {
                                "type": "nested",
                                "properties": {
                                    "name": {"type": "text"},
                                    "email": {"type": "keyword"}
                                }
                            },
                            "cc_addresses": {
                                "type": "nested",
                                "properties": {
                                    "name": {"type": "text"},
                                    "email": {"type": "keyword"}
                                }
                            },
                            "bcc_addresses": {
                                "type": "nested",
                                "properties": {
                                    "name": {"type": "text"},
                                    "email": {"type": "keyword"}
                                }
                            },
                            "status": {"type": "keyword"},
                            "priority": {"type": "keyword"},
                            "is_read": {"type": "boolean"},
                            "is_starred": {"type": "boolean"},
                            "created_at": {"type": "date"},
                            "updated_at": {"type": "date"},
                            "sent_at": {"type": "date"}
                        }
                    },
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0
                    }
                }
                
                # Use the correct API call for Elasticsearch 8.x
                self.client.indices.create(index=self.index_name, body=mapping)
                logger.info(f"Created Elasticsearch index: {self.index_name}")
            else:
                logger.info(f"Elasticsearch index {self.index_name} already exists")
        except Exception as e:
            logger.error(f"Error creating Elasticsearch index: {e}")
            raise
    
    async def index_email(self, email_data: Dict[str, Any]):
        """Index an email document"""
        try:
            # Prepare the document for indexing
            doc = {
                "id": email_data["id"],
                "user_id": email_data["user_id"],
                "subject": email_data.get("subject", ""),
                "body": email_data.get("body", ""),
                "html_body": email_data.get("html_body", ""),
                "from_address": email_data.get("from_address", {}),
                "to_addresses": email_data.get("to_addresses", []),
                "cc_addresses": email_data.get("cc_addresses", []),
                "bcc_addresses": email_data.get("bcc_addresses", []),
                "status": email_data.get("status"),
                "priority": email_data.get("priority"),
                "is_read": email_data.get("is_read", False),
                "is_starred": email_data.get("is_starred", False),
                "created_at": email_data.get("created_at"),
                "updated_at": email_data.get("updated_at"),
                "sent_at": email_data.get("sent_at")
            }
            
            # Use the correct API call for Elasticsearch 8.x
            self.client.index(index=self.index_name, id=email_data["id"], body=doc)
            logger.debug(f"Indexed email: {email_data['id']}")
        except Exception as e:
            logger.error(f"Error indexing email {email_data.get('id')}: {e}")
    
    async def update_email(self, email_id: str, email_data: Dict[str, Any]):
        """Update an indexed email document"""
        try:
            # Prepare the update document
            doc = {
                "subject": email_data.get("subject", ""),
                "body": email_data.get("body", ""),
                "html_body": email_data.get("html_body", ""),
                "from_address": email_data.get("from_address", {}),
                "to_addresses": email_data.get("to_addresses", []),
                "cc_addresses": email_data.get("cc_addresses", []),
                "bcc_addresses": email_data.get("bcc_addresses", []),
                "status": email_data.get("status"),
                "priority": email_data.get("priority"),
                "is_read": email_data.get("is_read", False),
                "is_starred": email_data.get("is_starred", False),
                "updated_at": email_data.get("updated_at"),
                "sent_at": email_data.get("sent_at")
            }
            
            # Use the correct API call for Elasticsearch 8.x
            self.client.update(index=self.index_name, id=email_id, body={"doc": doc})
            logger.debug(f"Updated indexed email: {email_id}")
        except Exception as e:
            logger.error(f"Error updating indexed email {email_id}: {e}")
    
    async def delete_email(self, email_id: str):
        """Delete an email document from the index"""
        try:
            self.client.delete(index=self.index_name, id=email_id)
            logger.debug(f"Deleted indexed email: {email_id}")
        except NotFoundError:
            logger.debug(f"Email {email_id} not found in index for deletion")
        except Exception as e:
            logger.error(f"Error deleting indexed email {email_id}: {e}")
    
    async def search_emails(
        self,
        user_id: str,
        search_query: str,
        folder: str = "inbox",
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        is_read: Optional[bool] = None,
        is_starred: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Search emails using Elasticsearch"""
        try:
            print(f"🔍 [ELASTICSEARCH] Searching for: '{search_query}' in folder: {folder}")
            
            # Build the query
            must_conditions = [
                {"term": {"user_id": user_id}},
                {
                    "multi_match": {
                        "query": search_query,
                        "fields": ["subject^2", "body", "html_body", "from_address.name", "to_addresses.name"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                }
            ]
            
            # Add folder-specific filters
            if folder == "inbox":
                must_conditions.append({"term": {"status": "received"}})
            elif folder == "sent":
                must_conditions.append({"term": {"status": "sent"}})
            elif folder == "drafts":
                must_conditions.append({"term": {"status": "draft"}})
            elif folder == "trash":
                must_conditions.append({"term": {"status": "trash"}})
            elif folder == "starred":
                must_conditions.append({"term": {"is_starred": True}})
            
            # Add additional filters
            if status:
                must_conditions.append({"term": {"status": status}})
            if is_read is not None:
                must_conditions.append({"term": {"is_read": is_read}})
            if is_starred is not None:
                must_conditions.append({"term": {"is_starred": is_starred}})
            
            query = {
                "bool": {
                    "must": must_conditions
                }
            }
            
            # Build the search request
            search_body = {
                "query": query,
                "sort": [
                    {"created_at": {"order": "desc"}}
                ],
                "from": (page - 1) * limit,
                "size": limit,
                "_source": ["id"]
            }
            
            # Execute the search using the correct API call
            response = self.client.search(index=self.index_name, body=search_body)
            
            # Extract results
            hits = response["hits"]["hits"]
            total = response["hits"]["total"]["value"]
            
            # Extract email IDs from hits
            email_ids = [hit["_source"]["id"] for hit in hits]
            
            print(f"✅ [ELASTICSEARCH] Found {len(email_ids)} results out of {total} total matches")
            
            return {
                "email_ids": email_ids,
                "total": total,
                "page": page,
                "limit": limit,
                "has_more": (page * limit) < total
            }
            
        except Exception as e:
            print(f"❌ [ELASTICSEARCH] Search failed: {e}")
            logger.error(f"Error searching emails: {e}")
            return {
                "email_ids": [],
                "total": 0,
                "page": page,
                "limit": limit,
                "has_more": False
            }
    
    async def bulk_index_emails(self, emails: List[Dict[str, Any]]):
        """Bulk index multiple emails"""
        try:
            actions = []
            for email in emails:
                action = {
                    "_index": self.index_name,
                    "_id": email["id"],
                    "_source": {
                        "id": email["id"],
                        "user_id": email["user_id"],
                        "subject": email.get("subject", ""),
                        "body": email.get("body", ""),
                        "html_body": email.get("html_body", ""),
                        "from_address": email.get("from_address", {}),
                        "to_addresses": email.get("to_addresses", []),
                        "cc_addresses": email.get("cc_addresses", []),
                        "bcc_addresses": email.get("bcc_addresses", []),
                        "status": email.get("status"),
                        "priority": email.get("priority"),
                        "is_read": email.get("is_read", False),
                        "is_starred": email.get("is_starred", False),
                        "created_at": email.get("created_at"),
                        "updated_at": email.get("updated_at"),
                        "sent_at": email.get("sent_at")
                    }
                }
                actions.append(action)
            
            if actions:
                from elasticsearch.helpers import bulk
                bulk(self.client, actions)
                logger.info(f"Bulk indexed {len(actions)} emails")
        except Exception as e:
            logger.error(f"Error bulk indexing emails: {e}")

# Global instance
elasticsearch_service = ElasticsearchService()
