import React from 'react';

import { useParty } from '@daml/react';

import { SetupAutomation } from './SetupAutomation';
import RoleRequestMenu from '../landing/RoleRequestMenu';

import { isHubDeployment } from '../../config';

import { useRolesContext } from '../../context/RolesContext';
import { useRoleRequestKinds } from '../../context/RequestsContext';

const RoleSetUp: React.FC = () => {
  const party = useParty();

  const roles = useRolesContext()
    .roles.filter(r => r.contract.payload.provider === party)
    .map(r => r.roleKind);

  const roleRequests = useRoleRequestKinds();

  return (
    <div className="set-up">
      <div className="setup-service">
        <div className="roles">
          {Array.from(roleRequests).map(rq => (
            <p className="p2 label" key={rq}>
              {rq} (Pending)
            </p>
          ))}
          {roles.map(s => (
            <p className="p2 label" key={s}>
              {s}
            </p>
          ))}
          <RoleRequestMenu />
        </div>
      </div>
    </div>
  );
};

export const AutomationSetup = () => {
  return isHubDeployment ? (
    <div className="link-tile">
      <SetupAutomation />
    </div>
  ) : null;
};
export default RoleSetUp;
