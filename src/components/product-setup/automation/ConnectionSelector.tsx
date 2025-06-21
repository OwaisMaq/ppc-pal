
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Connection {
  id: string;
  profile_name?: string;
  profile_id: string;
}

interface ConnectionSelectorProps {
  connections: Connection[];
  selectedConnectionId: string;
  onConnectionChange: (connectionId: string) => void;
}

const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  connections,
  selectedConnectionId,
  onConnectionChange,
}) => {
  if (connections.length <= 1) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Amazon Account</CardTitle>
        <CardDescription>
          Choose which Amazon account to configure automation for
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedConnectionId} onValueChange={onConnectionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((connection) => (
              <SelectItem key={connection.id} value={connection.id}>
                {connection.profile_name || `Profile ${connection.profile_id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default ConnectionSelector;
