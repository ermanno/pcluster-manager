import { ThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material'
import { render, waitFor, screen, prettyDOM } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Provider } from 'react-redux'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import i18n from '../../../i18n'
import { ListClusters } from '../../../model'
import { store, isAdmin } from '../../../store'
import Clusters from '../Clusters'


const queryClient = new QueryClient();
const mockClusters = [{
  clusterName: 'test-cluster',
  clusterStatus: 'CREATE_COMPLETE',
  version: '3.1.4',
  cloudformationStackArn: 'arn',
  region: 'region',
  cloudformationStackStatus: 'status'
}];

const MockProviders = (props: any) => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <ThemeProvider theme={createTheme()}>
            <BrowserRouter>
              {props.children}
            </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </I18nextProvider>
  </QueryClientProvider>
)

jest.mock('../../../model', () => ({
  ListClusters: jest.fn(),
}));

jest.mock('../../../store', () => ({
  ...jest.requireActual('../../../store') as any,
  isAdmin: () => true,
}));

const mockedUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
   ...jest.requireActual('react-router-dom') as any,
  useNavigate: () => mockedUseNavigate,
}));

describe('given a component to show the clusters list', () => {

  describe('when the clusters list is available', () => {
    beforeEach(() => {
      (ListClusters as jest.Mock).mockResolvedValue(mockClusters);
      mockedUseNavigate.mockReset();
    });

    it('should render the clusters', async () => {
      const { getByText } = await waitFor(() => render(
        <MockProviders>
          <Clusters />
        </MockProviders>
      ))   

      expect(getByText('test-cluster')).toBeTruthy()
      expect(getByText('CREATE COMPLETE')).toBeTruthy()
      expect(getByText('3.1.4')).toBeTruthy()
    })

    describe('when the user selects a cluster', () => { 
      it('should populate the split panel', async () => {
        const output = await waitFor(() => render(
          <MockProviders>
            <Clusters />
          </MockProviders>
        ))       
        
        await userEvent.click(output.getByRole('radio'))
        expect(mockedUseNavigate).toHaveBeenCalledWith('/clusters/test-cluster')
      })
    })

    describe('when the user clicks on "Create Cluster" button', () => {
      it('should redirect to configure', async () => {
        const output = await waitFor(() => render(
          <MockProviders>
            <Clusters />
          </MockProviders>
        ))       
        
        await userEvent.click(output.getByText('Create Cluster'))
        expect(mockedUseNavigate).toHaveBeenCalledWith('/configure')
      })
    })
  })
  
  describe('when there are no clusters available', () => {
    beforeEach(() => {
      (ListClusters as jest.Mock).mockResolvedValue([]);
    });

    it('should show the empty state', async () => {
      const { getByText } = await waitFor(() => render(
        <MockProviders>
          <Clusters />
        </MockProviders>
      ))

      expect(getByText('No clusters to display')).toBeTruthy()
    }) 
  }) 
})