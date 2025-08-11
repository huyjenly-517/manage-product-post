import { useState } from 'react';   
import { Link } from '@remix-run/react';

export default function BlogListPage() {
  const [posts, setPosts] = useState([
    { id: 1, title: 'Bài viết đầu tiên', author: 'Admin', date: '2025-08-01' },
    { id: 2, title: 'Shopify cho người mới', author: 'Nguyễn Văn A', date: '2025-08-05' },
  ]);

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc chắn muốn xoá bài viết này?')) {
      setPosts((prev) => prev.filter((post) => post.id !== id));
    }
  };

  const handleAdd = () => {
    const title = prompt('Nhập tiêu đề bài viết mới:');
    if (title) {
      const newPost = {
        id: Date.now(),
        title,
        author: 'Bạn',
        date: new Date().toISOString().slice(0, 10),
      };
      setPosts((prev) => [...prev, newPost]);
    }
  };

  const handleEdit = (id) => {
    const title = prompt('Nhập tiêu đề mới:');
    if (title) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, title } : post
        )
      );
    }
  };

  return (
    <div style={styles.container}>
      <h1>📚 Danh sách Blog Posts</h1>
      <button onClick={handleAdd} style={styles.addButton}>➕ Thêm bài viết</button>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Tiêu đề</th>
            <th>Tác giả</th>
            <th>Ngày</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr><td colSpan="4" style={{ textAlign: 'center' }}>Không có bài viết nào.</td></tr>
          ) : (
            posts.map((post) => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.author}</td>
                <td>{post.date}</td>
                <td>
                  <button onClick={() => handleEdit(post.id)} style={styles.actionBtn}>✏️ Sửa</button>
                  <button onClick={() => handleDelete(post.id)} style={styles.actionBtnRed}>🗑 Xoá</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '2rem auto',
    fontFamily: 'Arial, sans-serif',
  },
  addButton: {
    marginBottom: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '16px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  actionBtn: {
    marginRight: '0.5rem',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
  },
  actionBtnRed: {
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    color: 'white',
    backgroundColor: 'red',
    border: 'none',
    borderRadius: '4px',
  },
};

  