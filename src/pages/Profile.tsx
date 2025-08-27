import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Edit } from "lucide-react";

export default function Profile() {
  return (
    <AppLayout title="Profile">
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
            <CardDescription>
              View and manage your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Profile Management</h3>
              <p className="text-muted-foreground mb-4">
                This feature is coming soon. For now, you can edit your profile from the Dashboard.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                <Edit className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}