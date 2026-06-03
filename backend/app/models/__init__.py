# Models Module - Import all models so SQLAlchemy metadata is populated
from app.models.user import User
from app.models.project import Project, ProjectStakeholderAssociation
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country
from app.models.sdg import SDG
from app.models.chat import ChatSession, ChatMessage
