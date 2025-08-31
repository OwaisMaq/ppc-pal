import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSearchStudio, BrandTerm } from '@/hooks/useSearchStudio';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrandTermsManagerProps {
  profileId: string;
}

export const BrandTermsManager = ({ profileId }: BrandTermsManagerProps) => {
  const { brandTerms, fetchBrandTerms, addBrandTerm, deleteBrandTerm } = useSearchStudio();
  const { toast } = useToast();
  const [newTerm, setNewTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileId) {
      fetchBrandTerms(profileId);
    }
  }, [profileId, fetchBrandTerms]);

  const handleAddTerm = async () => {
    if (!newTerm.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a brand term',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await addBrandTerm(profileId, newTerm.trim());
      setNewTerm('');
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    try {
      await deleteBrandTerm(termId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (!profileId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Please select a profile to manage brand terms.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Brand Term */}
      <Card>
        <CardHeader>
          <CardTitle>Add Brand Term</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="brand-term">Brand Term</Label>
              <Input
                id="brand-term"
                placeholder="Enter brand name or term..."
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddTerm} disabled={loading || !newTerm.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Term
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Brand terms are used to identify and protect your brand-related search terms from negative keyword suggestions.
            Search terms containing these terms will be flagged as brand traffic.
          </div>
        </CardContent>
      </Card>

      {/* Brand Terms List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Brand Terms
            <Badge variant="secondary">{brandTerms.length} terms</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {brandTerms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No brand terms configured. Add some terms above to protect your brand traffic.
            </div>
          ) : (
            <div className="space-y-2">
              {brandTerms.map((term) => (
                <div 
                  key={term.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{term.term}</div>
                    <div className="text-sm text-muted-foreground">
                      Added {new Date(term.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTerm(term.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Brand Terms Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Protection:</strong> Search terms containing these brand terms will be flagged and excluded from negative keyword suggestions by default.
          </div>
          <div>
            <strong>Matching:</strong> Brand terms use case-insensitive partial matching. For example, "nike" will match "Nike Air", "NIKE shoes", "nikeid", etc.
          </div>
          <div>
            <strong>Recommendations:</strong> Add all variations of your brand name, including common misspellings, abbreviations, and product line names.
          </div>
          <div>
            <strong>Override:</strong> You can still manually add brand search terms as negatives if needed by enabling "Include Brand" in the filters.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};