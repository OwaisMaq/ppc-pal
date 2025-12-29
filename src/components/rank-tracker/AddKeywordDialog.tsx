import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddKeywordDialogProps {
  onAdd: (data: { asin: string; keyword: string }) => void;
  isAdding: boolean;
}

export function AddKeywordDialog({ onAdd, isAdding }: AddKeywordDialogProps) {
  const [open, setOpen] = useState(false);
  const [asin, setAsin] = useState("");
  const [keyword, setKeyword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asin.trim() || !keyword.trim()) return;
    
    onAdd({ asin, keyword });
    setAsin("");
    setKeyword("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Keyword
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track New Keyword</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asin">ASIN</Label>
            <Input
              id="asin"
              value={asin}
              onChange={(e) => setAsin(e.target.value)}
              placeholder="B08XYZ1234"
              pattern="^B0[A-Z0-9]{8}$"
              title="Enter a valid Amazon ASIN (e.g., B08XYZ1234)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="wireless mouse"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding || !asin.trim() || !keyword.trim()}>
              {isAdding ? "Adding..." : "Add Keyword"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
