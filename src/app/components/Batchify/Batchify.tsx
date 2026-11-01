"use client";
import { useState, useEffect, type ReactNode } from 'react';

interface BatchifyProps<T> {
  items: T[];
  batchSize?: number;
  renderItem: (batch: T[]) => ReactNode;
}

const Batchify = <T,>({ items, batchSize = 10, renderItem }: BatchifyProps<T>) => {
  const [batch, setBatch] = useState<T[][]>([]);

  useEffect(() => {
    const batches: T[][] = [];
    let currentBatch: T[] = [];

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