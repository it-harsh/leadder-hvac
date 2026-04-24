import { getPortalBusiness } from '@/lib/portal/get-portal-business'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calculator, Users, Code, ArrowRight, TrendingUp } from 'lucide-react'

export default async function PortalPage() {
  const { business, supabase } = await getPortalBusiness()

  if (!business) {
    redirect('/auth/login')
  }

  // Fetch stats in parallel
  const [
    { count: leadsCount },
    { count: productsConfigured },
    { count: newLeadsCount },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
    supabase
      .from('pricing_tiers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'new'),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {business.name}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your Leadder dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{leadsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {newLeadsCount || 0} new leads
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products Configured
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{productsConfigured || 0}</div>
            <p className="text-xs text-muted-foreground">
              pricing tiers set up
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Widget Status
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Active</div>
            <p className="text-xs text-muted-foreground">
              Ready to embed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Configure Pricing</CardTitle>
                <CardDescription>Set up your Good/Better/Best tiers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/portal/estimator">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">View Leads</CardTitle>
                <CardDescription>See captured quote requests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/leads">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Code className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Get Embed Code</CardTitle>
                <CardDescription>Add widget to your website</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/widget">
                Copy Code
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
