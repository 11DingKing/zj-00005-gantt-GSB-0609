import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { DependenciesModule } from './dependencies/dependencies.module';
import { MilestonesModule } from './milestones/milestones.module';
import { VersionsModule } from './versions/versions.module';
import { InvitationsModule } from './invitations/invitations.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    DependenciesModule,
    MilestonesModule,
    VersionsModule,
    InvitationsModule,
    WebSocketModule,
  ],
})
export class AppModule {}
