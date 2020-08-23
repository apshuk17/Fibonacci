const getAllIndices = (data) => {
  return data.map(({ fibindices }) => {
    return fibindices;
  });
};


const getIfIndicesAlreadyExists = (data, index) => {
    const allIndices = getAllIndices(data);
    console.log('##all indices', allIndices, typeof index);
    return allIndices.includes(index);
}

module.exports = {
    indexAlreadyExists: getIfIndicesAlreadyExists
};