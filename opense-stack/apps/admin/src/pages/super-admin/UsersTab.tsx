import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import type { useSuperAdminData } from './useSuperAdminData'

type Props = {
  data: ReturnType<typeof useSuperAdminData>
}

export const UsersTab = ({ data }: Props) => {
  const {
    newUserName,
    setNewUserName,
    newUserEmail,
    setNewUserEmail,
    newUserPassword,
    setNewUserPassword,
    onCreateUser,
    users,
    onRenameUser,
    onResetPassword,
    onDeleteUser,
  } = data

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Provision a platform user via secure admin function.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onCreateUser}>
            <Input
              value={newUserName}
              onChange={(event) => setNewUserName(event.target.value)}
              placeholder="Full name"
              required
            />
            <Input
              type="email"
              value={newUserEmail}
              onChange={(event) => setNewUserEmail(event.target.value)}
              placeholder="Email"
              required
            />
            <Input
              type="password"
              value={newUserPassword}
              onChange={(event) => setNewUserPassword(event.target.value)}
              placeholder="Temporary password"
              required
            />
            <Button type="submit">Create User</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Manage profile names and access.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Memberships</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name ?? '—'}</TableCell>
                  <TableCell>{user.email ?? '—'}</TableCell>
                  <TableCell>{(user.memberships ?? []).length}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const nextName = window.prompt('Full name', user.full_name ?? '')
                          if (typeof nextName === 'string') {
                            void onRenameUser(user.id, nextName)
                          }
                        }}
                      >
                        Rename
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onResetPassword(user.id)}>
                        Reset Password
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteUser(user.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
