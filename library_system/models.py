from flask_sqlalchemy import SQLAlchemy
from config import HOST, USERNAME, PASSWORD, DATABASE

# 初始化数据库工具
db = SQLAlchemy()

# 用户模型（对应users表）
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    password = db.Column(db.String(20), nullable=False)
    role = db.Column(db.String(10), default='user')

# 图书模型（对应books表）
class Book(db.Model):
    __tablename__ = 'books'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False)
    author = db.Column(db.String(30), nullable=False)
    category = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(10), default='可借')

# 借阅记录模型（对应borrow_records表）
class BorrowRecord(db.Model):
    __tablename__ = 'borrow_records'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'))
    borrow_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date, nullable=True)

    # 关联查询，方便通过记录找到用户和图书
    user = db.relationship('User', backref=db.backref('records'))
    book = db.relationship('Book', backref=db.backref('records'))