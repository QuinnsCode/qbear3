// src/app/components/TestButtonClient.tsx
"use client"

import { useState } from 'react';

export default function TestButtonClient() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Hello from client!');

  const handleClick = () => {
    setCount(count + 1);
    setMessage(`Clicked ${count + 1} times!`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'lightgreen', 
      border: '2px solid green',
      borderRadius: '8px',
      margin: '10px 0'
    }}>
      <h3>Interactive Client Component Test</h3>
      <p>{message}</p>
      <p>Count: {count}</p>
      <button 
        onClick={handleClick}
        style={{
          padding: '10px 20px',
          background: 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click me!
      </button>
    </div>
  );
}