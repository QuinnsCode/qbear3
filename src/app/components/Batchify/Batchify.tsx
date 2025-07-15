
"use client";
import { useState, useEffect } from 'react';

const Batchify = ({ items, batchSize = 10, renderItem }: any) => {
  const [batch, setBatch] = useState([]);

  useEffect(() => {
    const batches = [];
    let currentBatch = [];

    items.forEach((item) => {
      currentBatch.push(item);

      if (currentBatch.length === batchSize) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    });

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    setBatch(batches);
  }, [items, batchSize]);

  return (
    <div>
      {batch.map((item, index) => (
        <div key={index}>{renderItem(item)}</div>
      ))}
    </div>
  );
};

export default Batchify;