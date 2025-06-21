
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Upload, Package } from 'lucide-react';

interface ProductCogs {
  id: string;
  asin: string;
  productTitle: string;
  cogs: string;
}

const ProductInfo = () => {
  const [products, setProducts] = useState<ProductCogs[]>([
    { id: '1', asin: 'B07XJ8C8F5', productTitle: 'Wireless Bluetooth Headphones', cogs: '15.50' },
    { id: '2', asin: 'B08N5WRWNW', productTitle: 'Smart Fitness Tracker', cogs: '22.75' },
  ]);
  const [newAsin, setNewAsin] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCogs, setNewCogs] = useState('');

  const addProduct = () => {
    if (newAsin && newTitle && newCogs) {
      const newProduct: ProductCogs = {
        id: Date.now().toString(),
        asin: newAsin,
        productTitle: newTitle,
        cogs: newCogs
      };
      setProducts([...products, newProduct]);
      setNewAsin('');
      setNewTitle('');
      setNewCogs('');
    }
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const updateCogs = (id: string, newCogsValue: string) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, cogs: newCogsValue } : product
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Cost of Goods Sold (COGS) per ASIN
          </CardTitle>
          <CardDescription>
            Add and manage the cost of goods sold for each of your products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new product form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-2">
              <Label htmlFor="new-asin">ASIN</Label>
              <Input
                id="new-asin"
                placeholder="B07XJ8C8F5"
                value={newAsin}
                onChange={(e) => setNewAsin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-title">Product Title</Label>
              <Input
                id="new-title"
                placeholder="Product name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-cogs">COGS ($)</Label>
              <Input
                id="new-cogs"
                type="number"
                step="0.01"
                placeholder="15.50"
                value={newCogs}
                onChange={(e) => setNewCogs(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addProduct} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Products table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASIN</TableHead>
                  <TableHead>Product Title</TableHead>
                  <TableHead>COGS ($)</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.asin}</TableCell>
                    <TableCell>{product.productTitle}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={product.cogs}
                        onChange={(e) => updateCogs(product.id, e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No products added yet. Add your first product above.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Bulk Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file with ASIN and COGS data for multiple products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drop your CSV file here or click to browse
            </p>
            <p className="text-xs text-gray-500 mb-4">
              File should contain columns: ASIN, Product Title, COGS
            </p>
            <Button variant="outline">
              Choose File
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="px-8">
          Save Product Information
        </Button>
      </div>
    </div>
  );
};

export default ProductInfo;
