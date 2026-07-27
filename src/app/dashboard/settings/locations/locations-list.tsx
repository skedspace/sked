import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Location = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  is_active: boolean;
};

export function LocationsList({ locations }: { locations: Location[] }) {
  if (locations.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No locations yet. Add your first location to get started.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((location) => (
        <Card key={location.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-base">{location.name}</CardTitle>
            <Badge variant={location.is_active ? "default" : "secondary"}>
              {location.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {location.address && <p>{location.address}</p>}
            <p className="mt-1">{location.timezone}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
