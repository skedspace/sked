import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Resource = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  is_active: boolean;
  locations: { name: string } | null;
};

export function ResourcesList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No resources yet. Add your first court, room, or station.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <Card key={resource.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">{resource.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {resource.locations?.name}
              </p>
            </div>
            <Badge variant={resource.is_active ? "default" : "secondary"}>
              {resource.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Capacity: {resource.capacity} people</p>
            <p>Type: {resource.type}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
