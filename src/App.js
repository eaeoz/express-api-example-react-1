import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

// Create AuthContext to manage auth state
const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component to wrap around the app
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for token and userId in localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    if (storedToken && storedUserId) {
      setToken(storedToken);
      setUserId(storedUserId);
    }
    setLoading(false);
  }, []);

  const login = (newToken, newUserId) => {
    setToken(newToken);
    setUserId(newUserId);
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', newUserId);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, userId, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : null;
};

// Home component
const Home = () => {
  return (
    <div className="container">
      <h2>Welcome to the Home Page!</h2>
      <p>
        If you already have an account, you can log in <Link to="/login">here,</Link> or click here to
        <Link to="/register"> Register</Link>
      </p>
    </div>
  );
};

// LoginForm component
const LoginForm = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const credentials = btoa(`${username}:${password}`);
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.userId) {
          login(data.token, data.userId);
          navigate('/dashboard');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [picture, setPicture] = useState(null);
  const navigate = useNavigate();

  const handlePictureChange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(img, 0, 0, 200, 200);
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setPicture(croppedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    // const groupId = 100; // Automatically assign group ID as 100
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, picture }),
      });
      if (response.ok) {
        navigate('/login'); // Redirect to login page on successful registration
      } else {
        const error = await response.json();
        console.error(error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Username:
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label>
        Password:
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label>
        Picture:
        <input
          type="file"
          accept="image/*"
          onChange={handlePictureChange}
          required
        />
      </label>
      <button type="submit">Register</button>
    </form>
  );
};



const UserDashboard = () => {
  const { logout, token, userId } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState({ username: '', picture: '' });

  const fetchPosts = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/${userId}/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts); // Assuming the posts are in data.posts
        setUserInfo(data.userInfo); // Assuming userInfo is in data.userInfo
      } else {
        setError('Failed to fetch posts');
      }
    } catch (error) {
      setError('An error occurred while fetching posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId, token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  if (loading) {
    return <div className="container">Loading posts...</div>;
  }

  return (
    <div className="container">
      <nav className="navbar">
        <div className="navbar-content">
          <img src={userInfo.picture} alt="User" className="user-picture" />
          <span className="username">{userInfo.username}</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>
      <h2>Welcome to your dashboard!</h2>
      <CreatePost onPostCreated={handlePostCreated} />
      {error && <p className="error">{error}</p>}
      <h3>Your Posts:</h3>
      {posts.length > 0 ? (
        <div className="posts-container">
          {posts.map((post, index) => (
            <div key={post.PostID || index} className="post">
              {post.Content && <p className="post-content">{post.Content}</p>}
              {post.MediaType === 'image' && post.MediaURL && (
                <img src={post.MediaURL} alt="Post media" className="post-image" />
              )}
              {post.Timestamp && (
                <p className="post-timestamp">
                  Posted on: {new Date(post.Timestamp).toLocaleString()}
                </p>
              )}
              <div className="post-metrics">
                <span>👍 {post.LikesCount || 0}</span>
                <span>💬 {post.CommentsCount || 0}</span>
                <span>🔁 {post.SharesCount || 0}</span>
                <span>👁️ {post.ViewCount || 0}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No posts found.</p>
      )}
    </div>
  );
};

const CreatePost = ({ onPostCreated }) => {
  const { token, userId } = useAuth();
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState('text');
  const [mediaURL, setMediaURL] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newPost = {
      Content: content,
      MediaType: mediaType,
      MediaURL: mediaURL || null,
      Timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });

      if (response.ok) {
        const result = await response.json();
        setContent('');
        setMediaType('text');
        setMediaURL('');
        onPostCreated(result.data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create post');
      }
    } catch (error) {
      setError('An error occurred while creating the post');
    }
  };

  return (
    <div className="create-post">
      <h3>Create a New Post</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          required
        />
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        {mediaType !== 'text' && (
          <input
            type="url"
            value={mediaURL}
            onChange={(e) => setMediaURL(e.target.value)}
            placeholder="Enter media URL"
          />
        )}
        <button type="submit">Post</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
};


// Main App component
const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <UserDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/secure"
            element={
              <PrivateRoute>
                <div className="container">This is a secure component</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
