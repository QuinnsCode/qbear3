import { Product } from '@/app/types/Shipstation/product';
import { fetchProducts } from '@/app/serverActions/shipstation/products';

interface ProductsListProps {
  organizationId: string;
  searchParams?: {
    sku?: string;
    name?: string;
    page?: string;
    showInactive?: string;
  };
}

const ProductCard = ({ product }: { product: Product }) => {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 p-4">
      <div className="flex items-start space-x-4">
        {/* Product Image */}
        {product.thumbnailURL ? (
          <img 
            src={product.thumbnailURL} 
            alt={product.name}
            className="w-16 h-16 object-cover rounded-md border border-gray-200"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {/* Fallback placeholder */}
        <div className={`w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md border border-gray-200 flex items-center justify-center ${product.thumbnailURL ? 'hidden' : ''}`}>
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
              <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
              
              {/* Price and Category */}
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(product.price)}
                </span>
                {product.productCategory && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {product.productCategory.name}
                  </span>
                )}
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Weight:</span> {product.weightOz} oz
                </div>
                <div>
                  <span className="font-medium">Dimensions:</span> {product.length}"×{product.width}"×{product.height}"
                </div>
                {product.warehouseLocation && (
                  <div>
                    <span className="font-medium">Location:</span> {product.warehouseLocation}
                  </div>
                )}
                <div>
                  <span className="font-medium">Created:</span> {formatDate(product.createDate)}
                </div>
              </div>

              {/* Tags */}
              {product?.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {product.tags.map((tag) => (
                    <span 
                      key={tag.tagId}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Status and Actions */}
            <div className="flex flex-col items-end space-y-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                product.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.active ? 'Active' : 'Inactive'}
              </span>
              
              {/* Default Cost */}
              {product.defaultCost !== null && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="text-sm font-medium">{formatCurrency(product.defaultCost)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductsList = async ({ organizationId, searchParams = {} }: ProductsListProps) => {
  // Parse search params
  const params = {
    sku: searchParams.sku,
    name: searchParams.name,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    showInactive: searchParams.showInactive === 'true'
  };

  const data = await fetchProducts(organizationId, params);
  
  return (
    <div className="min-h-screen bg-gray-100 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 pt-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">
            {data.total} product{data.total !== 1 ? 's' : ''} found
            {params.showInactive && ' (including inactive)'}
          </p>
        </div>

        {/* Products Grid */}
        <div className="space-y-4">
          {data.products.map((product) => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>

        {/* Pagination Info */}
        {data.pages > 1 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Page {data.page} of {data.pages} ({data.total} total products)
          </div>
        )}

        {/* Empty State */}
        {data.products?.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-500">
              {searchParams.sku || searchParams.name 
                ? 'Try adjusting your search criteria.' 
                : 'No products have been added to this account yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsList;