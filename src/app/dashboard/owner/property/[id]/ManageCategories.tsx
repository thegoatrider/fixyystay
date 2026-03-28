'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Minus, Trash2, Home, Sparkles, Star } from 'lucide-react'
import { updateRoomCategories } from './actions'

interface Category {
  name: string
  count: number
  base_price: number
  price_bucket: string
}

interface ManageCategoriesProps {
  propertyId: string
  initialCategories: Category[]
}

const PRICE_BUCKETS = [
  '₹799', '₹999', '₹1299', '₹1499', '₹1999', '₹2499', '₹2999', '₹3499', '₹3999', '₹6999'
]

export default function ManageCategories({ propertyId, initialCategories }: ManageCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories || [])
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  
  const [newCat, setNewCat] = useState<Category>({
    name: 'Standard',
    count: 1,
    base_price: 2000,
    price_bucket: '₹1999'
  })

  const handleUpdate = async (updated: Category[]) => {
    setIsUpdating(true)
    try {
      const result = await updateRoomCategories(propertyId, updated)
      if (result.error) alert(result.error)
      else setCategories(updated)
    } catch (err) {
      alert('Failed to update categories')
    } finally {
      setIsUpdating(false)
    }
  }

  const addCategory = () => {
    const updated = [...categories, newCat]
    handleUpdate(updated)
    setShowAddForm(false)
  }

  const removeCategory = (index: number) => {
    if (!confirm('Are you sure? All rooms and their schedules for this category will be removed.')) return
    const updated = categories.filter((_, i) => i !== index)
    handleUpdate(updated)
  }

  const adjustCount = (index: number, delta: number) => {
    const updated = [...categories]
    updated[index].count = Math.max(1, updated[index].count + delta)
    handleUpdate(updated)
  }

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" />
            Room Categories
          </h2>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter mt-0.5">Manage your pooled inventory</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm" className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat, idx) => (
          <div key={idx} className="border-2 border-gray-50 bg-gray-50/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-blue-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black">
                {cat.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {cat.name} Room
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">{cat.count}</span>
                </h3>
                <p className="text-xs text-gray-500 font-medium">₹{cat.base_price} • {cat.price_bucket} bucket</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 bg-white border rounded-lg p-1 shadow-sm">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={() => adjustCount(idx, -1)}
                  disabled={isUpdating || cat.count <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold text-sm">{cat.count}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-gray-400 hover:text-green-500"
                  onClick={() => adjustCount(idx, 1)}
                  disabled={isUpdating}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-300 hover:text-red-600 hover:bg-red-50"
                onClick={() => removeCategory(idx)}
                disabled={isUpdating}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {categories.length === 0 && !showAddForm && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-gray-50/50">
            <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No categories yet</p>
            <Button onClick={() => setShowAddForm(true)} variant="link" className="text-blue-600 font-bold mt-2">Add your first category</Button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="bg-blue-50/50 border-2 border-blue-100 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" /> New Category Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-blue-400">Category Name</Label>
              <select 
                className="w-full h-10 border-2 border-blue-100 rounded-lg bg-white px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={newCat.name}
                onChange={e => setNewCat({...newCat, name: e.target.value})}
              >
                <option value="Standard">Standard</option>
                <option value="Executive">Executive</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Premium">Premium</option>
                <option value="Suite">Suite</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-blue-400">Base Price</Label>
              <Input 
                type="number" 
                value={newCat.base_price}
                onChange={e => setNewCat({...newCat, base_price: parseInt(e.target.value)})}
                className="h-10 border-2 border-blue-100 rounded-lg font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-blue-400">Price Bucket</Label>
              <select 
                className="w-full h-10 border-2 border-blue-100 rounded-lg bg-white px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={newCat.price_bucket}
                onChange={e => setNewCat({...newCat, price_bucket: e.target.value})}
              >
                {PRICE_BUCKETS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-blue-400">Initial Count</Label>
              <Input 
                type="number" 
                value={newCat.count}
                min="1"
                onChange={e => setNewCat({...newCat, count: parseInt(e.target.value)})}
                className="h-10 border-2 border-blue-100 rounded-lg font-bold"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={addCategory} disabled={isUpdating} className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold">Add Category</Button>
            <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1 font-bold">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
