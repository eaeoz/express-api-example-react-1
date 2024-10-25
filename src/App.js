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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/posts'); // Fetching posts from the API

      if (response.ok) {
        const data = await response.json();
        setPosts(data); // Assuming the posts are returned as an array
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
    fetchPosts(); // Fetch posts on component mount
  }, []);

  if (loading) {
    return <div className="container">Loading posts...</div>;
  }

  return (
    <div className="container">
      <h2>Welcome to the Home Page!</h2>
      <p>
        If you already have an account, you can log in <Link to="/login">here,</Link> or click here to
        <Link to="/register"> Register</Link>
      </p>

      <h3 className='posts-header'>Latest Posts:</h3>
      {error && <p className="error">{error}</p>}
      {posts.length > 0 ? (
        <div className="posts-container">
          {posts.map((post) => (
            <div key={post.PostID} className="post">
              {post.Content && <p className="post-content">{post.Content}</p>}
              {post.MediaType === 'image' && post.MediaURL && (
                <img src={post.MediaURL} alt="Post media" className="post-image" />
              )}
              {post.Timestamp && (
                <p className="post-timestamp">
                  Posted on: {new Date(post.Timestamp).toLocaleString()}
                </p>
              )}

            </div>
          ))}
        </div>
      ) : (
        <p>No posts found.</p>
      )}
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
      const response = await fetch('http://localhost:3003/api/login', {
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
      <ThemeSwitch />
    </div>
  );
};




const ThemeSwitch = () => {
  const [checked, setChecked] = React.useState(false);

  const handleChange = () => {
    setChecked(!checked);
    // Call the theme switching function here
    if (checked) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        id="theme-switch"
      />
      <span className="slider round"></span>
    </label>
  );
};

const PictureUploader = ({ onPictureChange }) => {
  const handlePictureChange = (event) => {
    const file = event.target.files[0];

    // Check if a file is selected before proceeding
    if (!file) {
      return; // Exit the function if no file is selected
    }

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
        onPictureChange(croppedBase64); // Pass the cropped image back to the parent
      };
    };
    reader.readAsDataURL(file);
  };

  return (
    <input
      type="file"
      accept="image/*"
      onChange={handlePictureChange}
      required
    />
  );
};


const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [picture, setPicture] = useState(null);
  const navigate = useNavigate();



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
      <PictureUploader onPictureChange={setPicture} />
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [mediaURL, setMediaURL] = useState(null);

  const handleOpenEditModal = async (postId) => {
    console.log("User id:", userId);
    console.log("Token :", token);
    console.log("Post id:", postId);
    const updatedPost = {
      Content: postContent,
      MediaType: 'image/jpeg',
      MediaURL: mediaURL || null,
      Timestamp: new Date().toISOString()
    };

    console.log(updatedPost)
    // try {
    //   const response = await fetch(`http://localhost:3003/api/posts/${postId}`, {
    //     method: 'PUT',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${token}`
    //     },
    //     body: JSON.stringify(updatedPost)
    //   });

    //   if (response.ok) {
    //     const result = await response.json();
    //     console.log(result);
    //   } else {
    //     const errorData = await response.json();
    //     console.error(errorData.message || 'Failed to update post');
    //   }
    // } catch (error) {
    //   console.error('An error occurred while updating the post', error.message);
    // }
  };

  const handleEditPost = (e) => {
    // e.preventDefault();
    setIsModalOpen(true);
    // Add code here to handle the edited post
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`http://localhost:3003/api/${userId}/posts`, {
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



  const handleDeletePost = async (postId) => {
    console.log('PostId:', postId); // Debugging log
    try {
      const confirmed = window.confirm('Are you sure you want to delete this post?');

      if (confirmed) {
        const response = await fetch(`http://localhost:3003/api/${userId}/posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Remove the deleted post from the state immediately for an optimistic UI update
          setPosts(posts.filter((post) => post.id !== postId));
          console.log('Post deleted successfully');

          // Refresh posts after 2 seconds
          setTimeout(() => {
            fetchPosts(); // Fetch updated posts from the server
          }, 2000);
        } else {
          setError('Failed to delete post');
        }
      }
    } catch (error) {
      setError('An error occurred while deleting the post');
    }
  };
  const handlePostCreated = (newPost) => {
    // Optimistically add the new post to the state
    setPosts([newPost, ...posts]);

    // Set timeout to fetch posts after 2 seconds
    setTimeout(() => {
      fetchPosts();
    }, 2000); // Delay of 2000 milliseconds (2 seconds)
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
      <ThemeSwitch />
      <h3 className='dashboard-header'>Send a Post</h3>
      <CreatePost onPostCreated={handlePostCreated} />
      {error && <p className="error">{error}</p>}
      <h3 className='posts-header'>Your Posts</h3>
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

              <div key={post.PostID || index} className="button-container">
                {/* ... */}
                <button onClick={() => handleEditPost(post)} className="edit-button">
                  Edit
                </button>
                <button onClick={() => handleDeletePost(post.id)} className="delete-button">
                  Delete
                </button>
              </div>
              {isModalOpen && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <button className="close-button" onClick={handleModalClose}>

                    </button>
                    <h2>Edit Post</h2>
                    <form onSubmit={() => handleOpenEditModal(post.id)}>
                      <textarea
                        className="edit-post-textarea"
                        defaultValue={post.Content}
                        onChange={(e) => setPostContent(e.target.value)}
                      />
                      <PictureUploader
                        onPictureChange={setMediaURL}
                      />
                      <button
                        className="edit-post-button"
                        type="submit"
                      >
                        Edit Post
                      </button>
                    </form>
                  </div>
                </div>
              )}
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
  const { token } = useAuth();
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState('image');
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
      const response = await fetch('http://localhost:3003/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });

      if (response.ok) {
        const result = await response.json();
        // Update the posts state directly here
        onPostCreated(result.data); // Assuming this function updates your posts state
        setContent('');
        setMediaType('image');
        setMediaURL('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create post');
      }
    } catch (error) {
      setError('An error occurred while creating the post');
    }
  };

  const handleContentChange = (e) => {
    if (e.target.value.length <= 200) { // Enforce max length
      setContent(e.target.value);
    }
  };

  return (
    <div className="create-post">
      <hr></hr>
      <h3>Create a New Post</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Your comment..."
          value={content}
          onChange={handleContentChange}
          maxLength={200} // Set max length to 200
          style={{ resize: 'none', overflow: 'hidden' }} // Prevent resizing and hide overflow
          rows={1 // Start with one row
          }
          onInput={(e) => {
            e.target.style.height = 'auto'; // Reset height
            e.target.style.height = `${e.target.scrollHeight}px`; // Set height to scroll height
          }}
          required
        />

        {/* Picture Uploader Component */}
        <PictureUploader onPictureChange={setMediaURL} />

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
