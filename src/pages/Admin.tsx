import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pendingSchools, setPendingSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [grantNotes, setGrantNotes] = useState("");

  useEffect(() => {
    if (profile?.admin_role) {
      fetchPendingSchools();
      fetchUsers();
    }
  }, [profile]);

  const fetchPendingSchools = async () => {
    const { data } = await supabase
      .from("schools")
      .select("*")
      .eq("submission_status", "pending");
    setPendingSchools(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, subscription_status")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const handleSchoolApproval = async (schoolId: string, action: "approved" | "denied") => {
    const { error } = await supabase
      .from("schools")
      .update({ submission_status: action })
      .eq("id", schoolId);

    if (!error) {
      await supabase.from("content_moderation").insert({
        content_type: "school",
        content_id: schoolId,
        moderator_id: profile?.id,
        action,
        moderated_at: new Date().toISOString(),
      });

      toast({
        title: `School ${action}`,
        description: `School submission has been ${action}`,
      });
      fetchPendingSchools();
    }
  };

  const grantPremiumSubscription = async () => {
    if (!selectedUser) return;

    const { error } = await supabase.from("subscription_management").insert({
      user_id: selectedUser,
      granted_by: profile?.id,
      subscription_type: "premium",
      is_manual_grant: true,
      notes: grantNotes,
    });

    if (!error) {
      await supabase
        .from("profiles")
        .update({ subscription_status: "premium" })
        .eq("id", selectedUser);

      toast({
        title: "Premium granted",
        description: "User has been granted premium subscription",
      });
      setSelectedUser("");
      setGrantNotes("");
      fetchUsers();
    }
  };

  if (!profile?.admin_role) {
    return (
      <AppLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You don't have admin privileges to access this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin Dashboard">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage users, content, and subscriptions
          </p>
        </div>

        <Tabs defaultValue="schools" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schools" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              School Approvals
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <Card>
              <CardHeader>
                <CardTitle>Pending School Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingSchools.map((school: any) => (
                    <div key={school.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{school.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {school.city}, {school.state}
                          </p>
                          <p className="text-sm">{school.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSchoolApproval(school.id, "approved")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleSchoolApproval(school.id, "denied")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingSchools.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No pending school submissions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 20).map((user: any) => (
                    <div key={user.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.subscription_status === "premium" ? "default" : "secondary"}>
                        {user.subscription_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Grant Premium Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="user-select">Select User</Label>
                  <select
                    id="user-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select a user...</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={grantNotes}
                    onChange={(e) => setGrantNotes(e.target.value)}
                    placeholder="Reason for granting premium..."
                  />
                </div>
                <Button
                  onClick={grantPremiumSubscription}
                  disabled={!selectedUser}
                  className="w-full"
                >
                  Grant Premium Subscription
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}