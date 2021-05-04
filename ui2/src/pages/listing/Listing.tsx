import React, { useState } from 'react';
import { RouteComponentProps, useParams, withRouter } from 'react-router-dom';
import { useParty, useLedger, useStreamQueries } from '@daml/react';
import { usePartyName } from '../../config';
import { Listing as ListingTemplate } from '@daml.js/da-marketplace/lib/Marketplace/Listing/Model';
import { Service as ClearedMarketService } from '@daml.js/da-marketplace/lib/Marketplace/Clearing/Market/Service';
import { Service } from '@daml.js/da-marketplace/lib/Marketplace/Listing/Service';
import { ServicePageProps, createDropdownProp } from '../common';
import {
  ManualFairValueCalculation,
  FairValue,
} from '@daml.js/da-marketplace/lib/Marketplace/Clearing/Market/Model/module';
import { Header, Button, Form } from 'semantic-ui-react';
import Tile from '../../components/Tile/Tile';
import StripedTable from '../../components/Table/StripedTable';
import { FairValueCalculationRequests } from './ManualCalculationRequests';
import { AssetDescription } from '@daml.js/da-marketplace/lib/Marketplace/Issuance/AssetDescription';
import ModalFormErrorHandled from '../../components/Form/ModalFormErrorHandled';
import { CreateEvent } from '@daml/ledger';

type FairValueRequestProps = {
  service?: Readonly<CreateEvent<ClearedMarketService, any, any>>;
  listingId?: string;
  selectListings?: boolean;
};

export const FairValueRequest: React.FC<FairValueRequestProps> = ({
  listingId,
  selectListings,
  service,
}) => {
  const ledger = useLedger();
  const party = useParty();
  const allAssets = useStreamQueries(AssetDescription).contracts;
  const assets = allAssets.filter(c => c.payload.assetId.version === '0');
  const [currencyLabel, setCurrencyLabel] = useState('');
  const selectedListingIds = !!listingId ? [listingId] : null;

  const requestFairValues = async () => {
    if (!service) return; // TODO: Display error
    const currencyAsset = assets.find(c => c.payload.assetId.label === currencyLabel);
    if (!currencyAsset) return;
    await ledger.exercise(ClearedMarketService.RequestFairValues, service.contractId, {
      party,
      currency: currencyAsset.payload.assetId,
      optListingIds: selectedListingIds,
    });
  };
  return (
    <ModalFormErrorHandled onSubmit={() => requestFairValues()} title="Request FV">
      <Form.Select
        label="Currency"
        placeholder="Select..."
        required
        options={assets.map(a => createDropdownProp(a.payload.assetId.label))}
        value={currencyLabel}
        onChange={(_, change) => setCurrencyLabel(change.value as string)}
      />
    </ModalFormErrorHandled>
  );
};

const ListingComponent: React.FC<RouteComponentProps & ServicePageProps<Service>> = ({
  services,
}) => {
  const party = useParty();
  const { getName } = usePartyName(party);
  const ledger = useLedger();
  const { contractId } = useParams<any>();

  const cid = contractId.replace('_', '#');

  const { contracts: listings, loading } = useStreamQueries(ListingTemplate);

  const listing = listings.find(a => a.contractId === cid);
  const service = services.find(s => s.payload.customer === party);

  const { contracts: fairValueContracts, loading: fairValuesLoading } = useStreamQueries(FairValue);
  const { contracts: clearedMarketServices } = useStreamQueries(ClearedMarketService);
  const clearedMarketService = clearedMarketServices.find(
    cms => cms.payload.customer === listing?.payload.customer
  );

  const fairValues = fairValueContracts.filter(
    fv => fv.payload.listingId === listing?.payload.listingId
  );

  const {
    contracts: manualFVRequestContracts,
    loading: manualFVRequestsLoading,
  } = useStreamQueries(ManualFairValueCalculation);
  const manualFVRequests = manualFVRequestContracts.filter(
    fv => fv.payload.listingId === listing?.payload.listingId
  );

  const requestDisableDelisting = async () => {
    console.log(service);
    if (!service || !listing) return; // TODO: Display error
    await ledger.exercise(Service.RequestDisableListing, service.contractId, {
      listingCid: listing.contractId,
    });
  };

  return (
    <div className="listing">
      <Header as="h2">{listing?.payload.listingId}</Header>
      <br />
      <br />
      <Tile header={<h4>Actions</h4>}>
        <div className="action-row">
          <Button.Group>
            {!!clearedMarketService && (
              <FairValueRequest
                listingId={listing?.payload.listingId}
                service={clearedMarketService}
              />
            )}
            <Button floated="left" className="ghost" onClick={() => requestDisableDelisting()}>
              Disable
            </Button>
          </Button.Group>
        </div>
      </Tile>
      {!!listing && (
        <Tile header={<h4>Details</h4>}>
          <StripedTable
            loading={loading}
            headings={[
              'Provider',
              'Client',
              'Listing ID',
              'Calendar ID',
              'Traded Asset',
              'Traded Asset Precision',
              'Quoted Asset',
              'Quoted Asset Precision',
            ]}
            rows={[
              {
                elements: [
                  getName(listing.payload.provider),
                  getName(listing.payload.customer),
                  listing.payload.listingId,
                  listing.payload.calendarId,
                  listing.payload.tradedAssetId.label,
                  listing.payload.tradedAssetPrecision,
                  listing.payload.quotedAssetId.label,
                  listing.payload.quotedAssetPrecision,
                ],
              },
            ]}
          />
        </Tile>
      )}
      {!!manualFVRequests.length && party === listing?.payload.customer && (
        <Tile header={<h4>Manual Fair Requests</h4>}>
          <FairValueCalculationRequests
            requests={manualFVRequests}
            loading={manualFVRequestsLoading}
          />
        </Tile>
      )}
      <Tile header={<h4>Fair Values</h4>}>
        <StripedTable
          headings={['Provider', 'Client', 'Listing ID', 'Price', 'Currency', 'Up To']}
          rowsClickable
          loading={fairValuesLoading}
          rows={fairValues.reverse().map(fv => {
            return {
              elements: [
                getName(fv.payload.provider),
                getName(fv.payload.customer),
                fv.payload.listingId,
                fv.payload.price,
                fv.payload.currency.label,
                fv.payload.upTo,
              ],
            };
          })}
        />
      </Tile>
    </div>
  );
};

export const Listing = withRouter(ListingComponent);
