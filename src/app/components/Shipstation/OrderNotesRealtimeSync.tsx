"use client"
import { useState, useEffect, useRef } from 'react';
import OrderNotesSection from "@/app/components/Shipstation/OrderNotesSection";

interface OrderNote {
  id: number;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

interface OrderNotesRealtimeSyncProps {
  initialNotes: OrderNote[];
  orderDbId: number;
  currentUser?: {
    id: string;
    username: string;
    createdAt?: Date;
  } | null;
}

export default function OrderNotesRealtimeSync({ 
  initialNotes,
  orderDbId,
  currentUser
}: OrderNotesRealtimeSyncProps) {
  
  const [notes, setNotes] = useState<OrderNote[]>(initialNotes);
  const lastInitialNotes = useRef(initialNotes);
  
  console.log('=== OrderNotesRealtimeSync Render ===');
  console.log('initialNotes count:', initialNotes.length);
  console.log('current notes state count:', notes.length);
  console.log('orderDbId:', orderDbId);
  console.log('currentUser:', currentUser?.username || 'undefined');
  console.log('initialNotes array reference:', initialNotes);

  useEffect(() => {
    console.log('🔍 useEffect triggered in OrderNotesRealtimeSync');
    console.log('  - lastInitialNotes.current length:', lastInitialNotes.current.length);
    console.log('  - new initialNotes length:', initialNotes.length);
    console.log('  - Are they the same reference?', lastInitialNotes.current === initialNotes);
    
    // Only update if initialNotes prop actually changed (reference comparison)
    if (lastInitialNotes.current !== initialNotes) {
      console.log('🔄 OrderNotesRealtimeSync: Fresh notes from server, updating state!');
      console.log('  - Old notes:', lastInitialNotes.current.length);
      console.log('  - New notes:', initialNotes.length);
      setNotes(initialNotes);
      lastInitialNotes.current = initialNotes;
    } else {
      console.log('⏭️ OrderNotesRealtimeSync: Same reference, skipping update');
    }
  }, [initialNotes]);

  return (
    <OrderNotesSection
      notes={notes}
      setNotes={setNotes}
      orderDbId={orderDbId}
      currentUser={currentUser || undefined}
    />
  );
}