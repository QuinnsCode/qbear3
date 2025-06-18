// @/app/components/OrderSearchPage.tsx
import { db } from "@/db";
import { searchOrderNumber } from "@/app/services/shipstation/searchOrderNumber";
// import { OrderPageWrapper } from "@/app/components/OrderPageWrapper";
// import OrderNotesSection from "@/app/components/Shipstation/OrderNotesSection";
import OrderNotesRealtimeSync from "@/app/components/Shipstation/OrderNotesRealtimeSync";
import { type User } from "@/db";

interface OrderSearchPageProps {
  orderNumber: string;
  currentUser: User | null;
}

export async function OrderSearchPage({ orderNumber, currentUser }: OrderSearchPageProps) {
  const renderTimestamp = new Date().toISOString();
  console.log('🏗️ OrderSearchPage rendering at:', renderTimestamp);
  
  try {
    // Fetch order data from ShipStation
    const orderData = await searchOrderNumber(orderNumber);
    
    // Transform the data
    let singleOrder;
    if (orderData.orders && Array.isArray(orderData.orders)) {
      singleOrder = orderData.orders[0];
    } else {
      singleOrder = orderData;
    }
    
    // We don't need these anymore since we're not using the wrapper

    // Database functionality - check if order exists and get notes
    let existingOrder: any = null;
    let orderNotes: any[] = [];
    
    if (singleOrder?.orderNumber) {
      existingOrder = await db.order.findUnique({
        where: { orderNumber: singleOrder.orderNumber },
        include: { 
          notes: {
            include: { user: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      // If order doesn't exist in DB, create it
      if (!existingOrder) {
        existingOrder = await db.order.create({
          data: {
            orderNumber: singleOrder.orderNumber,
            shipstationId: singleOrder.orderId,
            orderData: JSON.stringify(singleOrder),
            status: singleOrder.orderStatus || "",
            storeId: singleOrder.advancedOptions?.storeId || 0
          },
          include: { 
            notes: {
              include: { user: true },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }
      
      orderNotes = existingOrder.notes || [];
    }

    return (
      <div className="container mx-auto p-4">
        <h1>v1.00</h1>
        <h1 className="text-2xl font-bold mb-6">Search Results for Order: {orderNumber}</h1>
        
        {/* Debug Info - Remove this later */}
        <div className="mt-4 p-4 bg-yellow-100 border rounded mb-6">
          <h4 className="font-bold">Debug Info:</h4>
          <p>Order Number: {singleOrder?.orderNumber}</p>
          <p>User: {currentUser ? currentUser.username : 'Not logged in'}</p>
          <p>Existing Order: {existingOrder ? `Found (ID: ${existingOrder.id})` : 'Not found'}</p>
          <p>Notes count: {orderNotes.length}</p>
        </div>
        
        {/* Order Display - Inline instead of separate component */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Order Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="mb-2"><span className="font-semibold">Order Number:</span> {singleOrder?.orderNumber}</p>
              <p className="mb-2"><span className="font-semibold">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  singleOrder?.orderStatus === 'shipped' ? 'bg-green-100 text-green-800' : 
                  singleOrder?.orderStatus === 'awaiting_shipment' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {singleOrder?.orderStatus}
                </span>
              </p>
              <p className="mb-2 blur-sm"><span className="font-semibold">Customer:</span> {singleOrder?.customerEmail}</p>
            </div>
            <div>
              <p className="mb-2"><span className="font-semibold">Order Total:</span> ${singleOrder?.orderTotal || 'N/A'}</p>
              <p className="mb-2"><span className="font-semibold">Order Date:</span> {singleOrder?.orderDate ? new Date(singleOrder.orderDate).toLocaleDateString() : 'N/A'}</p>
              <p className="mb-2"><span className="font-semibold">Ship Date:</span> {singleOrder?.shipByDate ? new Date(singleOrder.shipByDate).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Items ({singleOrder?.items?.length || 0})</h3>
            <div className="space-y-3">
              {singleOrder?.items?.map((item: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">SKU</p>
                      <p className="font-mono text-sm">{item.sku || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-600">Product Name</p>
                      <p>{item.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Qty</p>
                        <p>{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Price</p>
                        <p>${item.unitPrice}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Notes Section */}
        {existingOrder?.id && (
          <OrderNotesRealtimeSync
            initialNotes={orderNotes}
            orderDbId={existingOrder?.id || 0}
            currentUser={currentUser}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('OrderSearchPage error:', error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p>Could not find order: {orderNumber}</p>
        <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}