"""
Single declarative Base for all ORM models (one metadata / cross-table transactions).
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
