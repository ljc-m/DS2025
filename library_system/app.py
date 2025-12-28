from flask import Flask, request, jsonify, render_template, redirect
from models import db, User, Book, BorrowRecord
from config import HOST, USERNAME, PASSWORD, DATABASE
from datetime import date
import matplotlib.pyplot as plt
import os

# 初始化Flask应用
app = Flask(__name__)
# 配置数据库连接
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:ljc%4003120776@localhost/library_management'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# 绑定数据库到应用
db.init_app(app)


# ---------------------- 前端页面路由（访问HTML页面） ----------------------
@app.route('/')
def index_redirect():
    return redirect('/login')


@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/index')
def index():
    return render_template('index.html')


@app.route('/book_list')
def book_list():
    return render_template('book_list.html')


@app.route('/borrow_list')
def borrow_list():
    return render_template('borrow_list.html')


# ---------------------- 用户注册功能 ----------------------
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({'code': 0, 'msg': '用户名已存在'})
    # 创建新用户
    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'code': 1, 'msg': '注册成功'})


# ---------------------- 图书CRUD功能 ----------------------
# 添加图书（管理员）
@app.route('/book/add', methods=['POST'])
def add_book():
    data = request.get_json()
    name = data.get('name')
    author = data.get('author')
    category = data.get('category')
    new_book = Book(name=name, author=author, category=category)
    db.session.add(new_book)
    db.session.commit()
    return jsonify({'code': 1, 'msg': '图书添加成功'})


# 查询图书
@app.route('/book/query', methods=['GET'])
def query_book():
    name = request.args.get('name', '')
    category = request.args.get('category', '')
    query = Book.query
    if name:
        query = query.filter(Book.name.like(f'%{name}%'))
    if category:
        query = query.filter(Book.category == category)
    books = query.all()
    result = [{'id': b.id, 'name': b.name, 'author': b.author, 'category': b.category, 'status': b.status} for b in
              books]
    return jsonify({'code': 1, 'data': result})


# 修改图书（管理员）
@app.route('/book/update/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    # 替换旧API：Query.get() -> db.session.get()，消除警告
    book = db.session.get(Book, book_id)
    if not book:
        return jsonify({'code': 0, 'msg': '图书不存在'})
    data = request.get_json()
    book.name = data.get('name', book.name)
    book.author = data.get('author', book.author)
    book.category = data.get('category', book.category)
    db.session.commit()
    return jsonify({'code': 1, 'msg': '图书修改成功'})


# 删除图书（管理员）：优化-同步删除对应借阅记录，避免无效记录残留
@app.route('/book/delete/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    # 替换旧API：Query.get() -> db.session.get()，消除警告
    book = db.session.get(Book, book_id)
    if not book:
        return jsonify({'code': 0, 'msg': '图书不存在'})
    # 先删除该图书对应的所有借阅记录（核心优化，从根源解决无效记录问题）
    BorrowRecord.query.filter_by(book_id=book_id).delete()
    # 再删除图书
    db.session.delete(book)
    db.session.commit()
    return jsonify({'code': 1, 'msg': '图书删除成功（对应借阅记录已同步删除）'})


# ---------------------- 借阅/归还功能 ----------------------
# 借阅图书
@app.route('/borrow/<int:user_id>/<int:book_id>', methods=['POST'])
def borrow_book(user_id, book_id):
    # 替换旧API：Query.get() -> db.session.get()，消除警告
    book = db.session.get(Book, book_id)
    if not book or book.status == '已借':
        return jsonify({'code': 0, 'msg': '图书不可借'})
    # 创建借阅记录
    new_record = BorrowRecord(
        user_id=user_id,
        book_id=book_id,
        borrow_date=date.today()
    )
    # 更新图书状态
    book.status = '已借'
    db.session.add(new_record)
    db.session.commit()
    return jsonify({'code': 1, 'msg': '借阅成功'})


# 归还图书
@app.route('/return/<int:record_id>', methods=['PUT'])
def return_book(record_id):
    # 替换旧API：Query.get() -> db.session.get()，消除警告
    record = db.session.get(BorrowRecord, record_id)
    if not record or record.return_date:
        return jsonify({'code': 0, 'msg': '记录不存在或已归还'})
    # 更新归还日期
    record.return_date = date.today()
    # 更新图书状态
    book = db.session.get(Book, record.book_id)
    if book:  # 容错：避免图书已被删除的情况
        book.status = '可借'
    db.session.commit()
    return jsonify({'code': 1, 'msg': '归还成功'})


# ---------------------- 复杂查询（多表联接） ----------------------
# 查询某分类下未被借阅的图书
@app.route('/book/available/<string:category>', methods=['GET'])
def query_available_book(category):
    subquery = db.session.query(BorrowRecord.book_id).filter(BorrowRecord.return_date.is_(None)).subquery()
    available_books = Book.query.filter(
        Book.category == category,
        Book.id.notin_(subquery),
        Book.status == '可借'
    ).all()
    result = [{'id': b.id, 'name': b.name, 'author': b.author} for b in available_books]
    return jsonify({'code': 1, 'data': result})


# ---------------------- 新增接口：用户ID查询 + 借阅记录查询（带容错） ----------------------
# 获取当前用户的借阅记录：核心优化-添加容错处理，避免None属性访问错误
@app.route('/borrow/records/<int:user_id>', methods=['GET'])
def get_borrow_records(user_id):
    # 查询当前用户的所有借阅记录（包含未归还的）
    records = BorrowRecord.query.filter_by(user_id=user_id).all()
    result = []
    for record in records:
        # 容错处理：判断图书是否存在，不存在则给默认值
        book_name = record.book.name if (record.book and record.book.name) else "该图书已被删除"
        # 容错处理：判断用户是否存在，不存在则给默认值
        user_name = record.user.username if (record.user and record.user.username) else "该用户已注销"
        # 格式化借阅日期
        borrow_date_str = record.borrow_date.strftime('%Y-%m-%d') if record.borrow_date else "未知日期"
        # 格式化归还日期
        return_date_str = record.return_date.strftime('%Y-%m-%d') if record.return_date else '未归还'

        result.append({
            'id': record.id,
            'username': user_name,
            'book_name': book_name,
            'borrow_date': borrow_date_str,
            'return_date': return_date_str
        })
    return jsonify({'code': 1, 'msg': '获取借阅记录成功', 'data': result})


# 根据用户名获取用户ID（供前端动态获取）
@app.route('/user/get_id/<username>', methods=['GET'])
def get_user_id(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'code': 0, 'msg': '用户不存在', 'data': None})
    return jsonify({'code': 1, 'msg': '获取用户ID成功', 'data': user.id})


# ---------------------- 数据可视化 ----------------------
# 图书分类占比饼图
@app.route('/visual/category', methods=['GET'])
def category_visual():
    # 创建static文件夹（若不存在）
    if not os.path.exists('static'):
        os.makedirs('static')
    # 查询分类数据
    category_data = db.session.query(Book.category, db.func.count(Book.id)).group_by(Book.category).all()
    categories = [item[0] for item in category_data]
    counts = [item[1] for item in category_data]
    # 解决中文乱码
    plt.rcParams['font.sans-serif'] = ['SimHei']
    plt.rcParams['axes.unicode_minus'] = False
    # 绘制饼图
    plt.pie(counts, labels=categories, autopct='%1.1f%%', startangle=90)
    plt.title('图书分类占比统计')
    plt.savefig('static/category_pie.png')
    plt.close()
    return jsonify({'code': 1, 'img_url': '/static/category_pie.png'})


# ---------------------- 启动应用 ----------------------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # 创建表（若不存在）
    app.run(debug=True, port=5000)